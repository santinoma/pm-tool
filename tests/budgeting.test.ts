import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { aggregateByProject } from "../src/tenant/timeTracking/duration";
import { computeBudgetStatus } from "../src/tenant/budgeting/aggregate";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let userId: string;

beforeEach(async () => {
  const subdomain = `budgeting-${Date.now()}`;
  await provisionTenant({ name: "Budgeting Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const user = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
  userId = user.id;

  const project = await tenantDb.project.create({
    data: {
      name: "Budgeted Project",
      budgetHours: 10,
      hourlyRate: 50,
      workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } },
    },
    include: { workflow: { include: { statuses: true } } },
  });
  projectId = project.id;

  const task = await tenantDb.task.create({
    data: {
      title: "Task",
      statusId: project.workflow.statuses[0].id,
      projects: { create: { projectId, isPrimary: true } },
    },
  });

  await tenantDb.timeEntry.create({
    data: { userId, projectId, durationMinutes: 60 },
  });
  await tenantDb.timeEntry.create({
    data: { userId, taskId: task.id, durationMinutes: 120 },
  });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("budget aggregation (data layer, mirrors the API route logic)", () => {
  it("sums project-level and primary-task-level time entries into actual hours and amount", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.findUniqueOrThrow({ where: { id: projectId } });
    const entries = await tenantDb.timeEntry.findMany({
      where: { durationMinutes: { not: null } },
      select: { taskId: true, projectId: true, durationMinutes: true },
    });
    const taskLinks = await tenantDb.taskProject.findMany({
      where: { isPrimary: true },
      select: { taskId: true, projectId: true, isPrimary: true },
    });

    const actualMinutesByProject = aggregateByProject(entries, taskLinks);
    const { actualHours, actualAmount } = computeBudgetStatus(
      actualMinutesByProject[projectId] ?? 0,
      project.hourlyRate,
    );

    expect(actualHours).toBe(3);
    expect(actualAmount).toBe(150);
  });

  it("updates budget fields on the project", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const updated = await tenantDb.project.update({
      where: { id: projectId },
      data: { budgetHours: 20, budgetAmount: 1000, hourlyRate: 75 },
    });
    expect(updated.budgetHours).toBe(20);
    expect(updated.budgetAmount).toBe(1000);
    expect(updated.hourlyRate).toBe(75);
  });
});
