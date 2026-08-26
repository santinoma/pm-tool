import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `crosstag-${Date.now()}`;
  await provisionTenant({ name: "CrossTag Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("task cross-tagging", () => {
  it("links one task to a second project without duplicating the task", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const projectA = await tenantDb.project.create({
      data: { name: "A", statuses: { create: defaultWorkflowStatuses() } },
      include: { statuses: true },
    });
    const projectB = await tenantDb.project.create({
      data: { name: "B", statuses: { create: defaultWorkflowStatuses() } },
    });

    const task = await tenantDb.task.create({
      data: {
        title: "Shared task",
        statusId: projectA.statuses[0].id,
        projects: { create: { projectId: projectA.id, isPrimary: true } },
      },
    });

    await tenantDb.taskProject.create({
      data: { taskId: task.id, projectId: projectB.id, isPrimary: false },
    });

    const allTasks = await tenantDb.task.findMany();
    expect(allTasks).toHaveLength(1);

    const links = await tenantDb.taskProject.findMany({ where: { taskId: task.id } });
    expect(links).toHaveLength(2);
    expect(links.some((l) => l.projectId === projectA.id && l.isPrimary)).toBe(true);
    expect(links.some((l) => l.projectId === projectB.id && !l.isPrimary)).toBe(true);

    const tasksInB = await tenantDb.task.findMany({
      where: { projects: { some: { projectId: projectB.id } } },
    });
    expect(tasksInB).toHaveLength(1);
    expect(tasksInB[0].id).toBe(task.id);
  });

  it("rejects linking a task to a project it is already linked to", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({
      data: { name: "Solo", statuses: { create: defaultWorkflowStatuses() } },
      include: { statuses: true },
    });
    const task = await tenantDb.task.create({
      data: {
        title: "Task",
        statusId: project.statuses[0].id,
        projects: { create: { projectId: project.id } },
      },
    });

    await expect(
      tenantDb.taskProject.create({
        data: { taskId: task.id, projectId: project.id, isPrimary: false },
      }),
    ).rejects.toThrow();
  });
});
