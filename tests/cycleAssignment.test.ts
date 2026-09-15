import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { computeCycleInsights } from "../src/tenant/cycles/cycleInsights";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let statusId: string;
let doneStatusId: string;
let cycleId: string;

beforeEach(async () => {
  const subdomain = `cycleassign-${Date.now()}`;
  await provisionTenant({ name: "Cycle Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const project = await tenantDb.project.create({ data: { name: "Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
  const todoStatus = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  const doneStatus = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "Done", category: "done", position: 1 },
  });
  statusId = todoStatus.id;
  doneStatusId = doneStatus.id;

  const cycle = await tenantDb.cycle.create({
    data: {
      projectId,
      name: "Cycle 1",
      startDate: new Date("2026-08-10"),
      endDate: new Date("2026-08-24"),
    },
  });
  cycleId = cycle.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("cycle assignment and insights (mirrors PATCH /api/tenant/tasks/[id])", () => {
  it("marks a task assigned before the cycle start as planned scope, not creep", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const task = await tenantDb.task.create({
      data: {
        title: "Planned",
        statusId: doneStatusId,
        estimatedHours: 5,
        cycleId,
        cycleAssignedAt: new Date("2026-08-05"),
        projects: { create: { projectId, isPrimary: true } },
      },
    });

    const cycle = await tenantDb.cycle.findUniqueOrThrow({
      where: { id: cycleId },
      include: { tasks: { include: { status: true } } },
    });
    const insights = computeCycleInsights(
      cycle.tasks.map((t) => ({
        statusCategory: t.status.category,
        estimatedHours: t.estimatedHours,
        cycleAssignedAt: t.cycleAssignedAt,
      })),
      cycle.startDate,
    );

    expect(insights.plannedScopeHours).toBe(5);
    expect(insights.scopeCreepHours).toBe(0);
    expect(insights.velocity).toBe(5);
    expect(task.id).toBeTruthy();
  });

  it("marks a task assigned after the cycle start as scope creep", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.task.create({
      data: {
        title: "Late addition",
        statusId,
        estimatedHours: 3,
        cycleId,
        cycleAssignedAt: new Date("2026-08-20"),
        projects: { create: { projectId, isPrimary: true } },
      },
    });

    const cycle = await tenantDb.cycle.findUniqueOrThrow({
      where: { id: cycleId },
      include: { tasks: { include: { status: true } } },
    });
    const insights = computeCycleInsights(
      cycle.tasks.map((t) => ({
        statusCategory: t.status.category,
        estimatedHours: t.estimatedHours,
        cycleAssignedAt: t.cycleAssignedAt,
      })),
      cycle.startDate,
    );

    expect(insights.scopeCreepHours).toBe(3);
    expect(insights.scopeCreepPercent).toBe(100);
  });
});
