import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { computeOverdueTasks } from "../src/tenant/reporting/overdue";
import { computeProgress } from "../src/tenant/reporting/progress";
import { WIDGET_CATALOG, mergeWidgetPreferences } from "../src/tenant/reporting/widgets";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let userId: string;
let projectId: string;

beforeEach(async () => {
  const subdomain = `reporting-${Date.now()}`;
  await provisionTenant({ name: "Reporting Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const user = await tenantDb.user.create({ data: { email: "user@example.com", role: "member" } });
  userId = user.id;

  const project = await tenantDb.project.create({
    data: { name: "Reporting Project", statuses: { create: defaultWorkflowStatuses() } },
    include: { statuses: true },
  });
  projectId = project.id;
  const doneStatus = project.statuses.find((s) => s.category === "done")!;
  const notStartedStatus = project.statuses.find((s) => s.category === "not_started")!;

  await tenantDb.task.create({
    data: {
      title: "Overdue task",
      statusId: notStartedStatus.id,
      dueDate: new Date("2020-01-01T00:00:00.000Z"),
      inTriage: false,
      projects: { create: { projectId } },
    },
  });
  await tenantDb.task.create({
    data: {
      title: "Done task",
      statusId: doneStatus.id,
      inTriage: false,
      projects: { create: { projectId } },
    },
  });
  await tenantDb.task.create({
    data: {
      title: "Triage task, overdue but not active",
      statusId: notStartedStatus.id,
      dueDate: new Date("2020-01-01T00:00:00.000Z"),
      inTriage: true,
      projects: { create: { projectId } },
    },
  });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("reporting aggregation (data layer, mirrors the report route logic)", () => {
  it("excludes triage tasks from the overdue report", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const tasks = await tenantDb.task.findMany({
      where: { inTriage: false },
      include: { status: true },
    });
    const overdue = computeOverdueTasks(
      tasks.map((t) => ({ id: t.id, dueDate: t.dueDate, statusCategory: t.status.category })),
      new Date(),
    );
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).not.toBe(undefined);
  });

  it("excludes triage tasks from the progress report", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { taskLinks: { where: { isPrimary: true }, include: { task: { include: { status: true } } } } },
    });
    const tasks = project.taskLinks
      .map((link) => link.task)
      .filter((task) => !task.inTriage)
      .map((task) => ({ statusCategory: task.status.category }));
    expect(computeProgress(tasks)).toEqual({ done: 1, total: 2, percent: 50 });
  });
});

describe("dashboard widget preferences", () => {
  it("returns catalog defaults with no saved preferences", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const saved = await tenantDb.dashboardWidgetPreference.findMany({ where: { userId } });
    const widgets = mergeWidgetPreferences(WIDGET_CATALOG, saved);
    expect(widgets).toHaveLength(WIDGET_CATALOG.length);
    expect(widgets.every((w) => w.enabled)).toBe(true);
  });

  it("persists a preference update and reflects it on the next read", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.dashboardWidgetPreference.upsert({
      where: { userId_widgetType: { userId, widgetType: "overdue_tasks" } },
      create: { userId, widgetType: "overdue_tasks", enabled: false, position: 0 },
      update: { enabled: false },
    });

    const saved = await tenantDb.dashboardWidgetPreference.findMany({ where: { userId } });
    const widgets = mergeWidgetPreferences(WIDGET_CATALOG, saved);
    const overdueWidget = widgets.find((w) => w.type === "overdue_tasks")!;
    expect(overdueWidget.enabled).toBe(false);
  });
});
