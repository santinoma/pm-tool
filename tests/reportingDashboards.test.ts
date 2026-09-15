import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { computeOverdueTasks } from "../src/tenant/reporting/overdue";
import { computeProgress } from "../src/tenant/reporting/progress";
import { WIDGET_CATALOG } from "../src/tenant/reporting/widgets";
import { getOrCreateDashboards } from "../src/tenant/reporting/dashboards";
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
    data: { name: "Reporting Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
    include: { workflow: { include: { statuses: true } } },
  });
  projectId = project.id;
  const doneStatus = project.workflow.statuses.find((s) => s.category === "done")!;
  const notStartedStatus = project.workflow.statuses.find((s) => s.category === "not_started")!;

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

describe("dashboards", () => {
  it("creates a default dashboard pre-populated with the widget catalog on first access", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const context = { tenantDb } as Parameters<typeof getOrCreateDashboards>[0];
    const dashboards = await getOrCreateDashboards(context, userId);
    expect(dashboards).toHaveLength(1);
    expect(dashboards[0].isDefault).toBe(true);
    expect(dashboards[0].widgets).toHaveLength(WIDGET_CATALOG.length);
    expect(dashboards[0].widgets.every((w) => w.enabled)).toBe(true);
  });

  it("returns the same dashboards on a later call instead of creating duplicates", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const context = { tenantDb } as Parameters<typeof getOrCreateDashboards>[0];
    const first = await getOrCreateDashboards(context, userId);
    await tenantDb.dashboardWidget.update({
      where: { id: first[0].widgets.find((w) => w.widgetType === "overdue_tasks")!.id },
      data: { enabled: false },
    });

    const second = await getOrCreateDashboards(context, userId);
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(first[0].id);
    const overdueWidget = second[0].widgets.find((w) => w.widgetType === "overdue_tasks")!;
    expect(overdueWidget.enabled).toBe(false);
  });
});
