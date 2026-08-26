import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses, detectDependencyCycle } from "../src/tenant/projects/workflow";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `deps-${Date.now()}`;
  await provisionTenant({ name: "Deps Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("task dependencies", () => {
  it("creates a blocking/blocked relationship between two tasks", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({
      data: { name: "Deps Project", statuses: { create: defaultWorkflowStatuses() } },
      include: { statuses: true },
    });
    const statusId = project.statuses[0].id;

    const taskA = await tenantDb.task.create({
      data: { title: "A", statusId, projects: { create: { projectId: project.id } } },
    });
    const taskB = await tenantDb.task.create({
      data: { title: "B", statusId, projects: { create: { projectId: project.id } } },
    });

    await tenantDb.taskDependency.create({
      data: { blockingTaskId: taskA.id, blockedTaskId: taskB.id },
    });

    const blocking = await tenantDb.taskDependency.findMany({ where: { blockingTaskId: taskA.id } });
    expect(blocking).toHaveLength(1);
    expect(blocking[0].blockedTaskId).toBe(taskB.id);
  });

  it("real cycle check against a database-backed edge set matches the pure function", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({
      data: { name: "Cycle Project", statuses: { create: defaultWorkflowStatuses() } },
      include: { statuses: true },
    });
    const statusId = project.statuses[0].id;

    const taskA = await tenantDb.task.create({
      data: { title: "A", statusId, projects: { create: { projectId: project.id } } },
    });
    const taskB = await tenantDb.task.create({
      data: { title: "B", statusId, projects: { create: { projectId: project.id } } },
    });

    await tenantDb.taskDependency.create({
      data: { blockingTaskId: taskA.id, blockedTaskId: taskB.id },
    });

    const existingEdges = await tenantDb.taskDependency.findMany({
      select: { blockingTaskId: true, blockedTaskId: true },
    });

    const wouldCycle = detectDependencyCycle(existingEdges, {
      blockingTaskId: taskB.id,
      blockedTaskId: taskA.id,
    });
    expect(wouldCycle).toBe(true);
  });
});
