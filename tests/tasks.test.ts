import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `tasks-${Date.now()}`;
  await provisionTenant({ name: "Tasks Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("task creation (data layer)", () => {
  it("creates a task in triage with the project's default status", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({
      data: { name: "Task Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
      include: { workflow: { include: { statuses: true } } },
    });
    const defaultStatus = project.workflow.statuses.find((s) => s.isDefault)!;

    const task = await tenantDb.task.create({
      data: {
        title: "First task",
        statusId: defaultStatus.id,
        inTriage: true,
        projects: { create: { projectId: project.id, isPrimary: true } },
      },
      include: { projects: true },
    });

    expect(task.inTriage).toBe(true);
    expect(task.statusId).toBe(defaultStatus.id);
    expect(task.projects).toHaveLength(1);
    expect(task.projects[0].isPrimary).toBe(true);
  });

  it("moves a task out of triage and updates its status", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({
      data: { name: "Triage Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
      include: { workflow: { include: { statuses: true } } },
    });
    const defaultStatus = project.workflow.statuses.find((s) => s.isDefault)!;
    const startedStatus = project.workflow.statuses.find((s) => s.category === "started")!;

    const task = await tenantDb.task.create({
      data: {
        title: "Triage task",
        statusId: defaultStatus.id,
        projects: { create: { projectId: project.id } },
      },
    });

    const updated = await tenantDb.task.update({
      where: { id: task.id },
      data: { inTriage: false, statusId: startedStatus.id },
    });

    expect(updated.inTriage).toBe(false);
    expect(updated.statusId).toBe(startedStatus.id);
  });

  it("filters tasks by project via the TaskProject relation", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const projectA = await tenantDb.project.create({
      data: { name: "A", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
      include: { workflow: { include: { statuses: true } } },
    });
    const projectB = await tenantDb.project.create({
      data: { name: "B", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
      include: { workflow: { include: { statuses: true } } },
    });

    await tenantDb.task.create({
      data: {
        title: "Task in A",
        statusId: projectA.workflow.statuses[0].id,
        projects: { create: { projectId: projectA.id } },
      },
    });
    await tenantDb.task.create({
      data: {
        title: "Task in B",
        statusId: projectB.workflow.statuses[0].id,
        projects: { create: { projectId: projectB.id } },
      },
    });

    const tasksInA = await tenantDb.task.findMany({
      where: { projects: { some: { projectId: projectA.id } } },
    });
    expect(tasksInA).toHaveLength(1);
    expect(tasksInA[0].title).toBe("Task in A");
  });
});
