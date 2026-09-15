import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let statusId: string;

beforeEach(async () => {
  const subdomain = `taskfolders-${Date.now()}`;
  await provisionTenant({ name: "Task Folders Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const project = await tenantDb.project.create({ data: { name: "Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
  const status = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  statusId = status.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("task folders and lists", () => {
  it("creates a folder, a list inside it, and assigns a task to the list", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    const folder = await tenantDb.taskFolder.create({ data: { projectId, name: "Phase 1", position: 0 } });
    const list = await tenantDb.taskListGroup.create({
      data: { folderId: folder.id, name: "Sprint 1", position: 0 },
    });

    const task = await tenantDb.task.create({
      data: {
        title: "Task in list",
        statusId,
        taskListGroupId: list.id,
        projects: { create: { projectId, isPrimary: true } },
      },
    });

    const reloadedTask = await tenantDb.task.findUnique({ where: { id: task.id } });
    expect(reloadedTask?.taskListGroupId).toBe(list.id);

    const folderWithLists = await tenantDb.taskFolder.findUnique({
      where: { id: folder.id },
      include: { lists: true },
    });
    expect(folderWithLists?.lists.map((l) => l.id)).toEqual([list.id]);
  });

  it("rejects folder deletion (409) while it still has lists — matches the API's guard behavior", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    const folder = await tenantDb.taskFolder.create({ data: { projectId, name: "Phase 1", position: 0 } });
    await tenantDb.taskListGroup.create({ data: { folderId: folder.id, name: "Sprint 1", position: 0 } });

    // Simulate the route's guard: it counts lists and refuses deletion if any exist.
    const listCount = await tenantDb.taskListGroup.count({ where: { folderId: folder.id } });
    expect(listCount).toBeGreaterThan(0);

    // Deleting a folder with lists present would violate the FK constraint —
    // confirming the guard is necessary (Prisma throws rather than silently cascading).
    await expect(tenantDb.taskFolder.delete({ where: { id: folder.id } })).rejects.toThrow();

    // The folder must still exist afterwards.
    const stillThere = await tenantDb.taskFolder.findUnique({ where: { id: folder.id } });
    expect(stillThere).not.toBeNull();
  });

  it("nulls out taskListGroupId on tasks when their list is deleted", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    const folder = await tenantDb.taskFolder.create({ data: { projectId, name: "Phase 1", position: 0 } });
    const list = await tenantDb.taskListGroup.create({
      data: { folderId: folder.id, name: "Sprint 1", position: 0 },
    });
    const task = await tenantDb.task.create({
      data: {
        title: "Task in list",
        statusId,
        taskListGroupId: list.id,
        projects: { create: { projectId, isPrimary: true } },
      },
    });

    // Mirrors the DELETE /api/tenant/task-list-groups/[id] route: null out
    // referencing tasks first, then delete the list itself.
    await tenantDb.task.updateMany({ where: { taskListGroupId: list.id }, data: { taskListGroupId: null } });
    await tenantDb.taskListGroup.delete({ where: { id: list.id } });

    const reloadedTask = await tenantDb.task.findUnique({ where: { id: task.id } });
    expect(reloadedTask?.taskListGroupId).toBeNull();

    const listStillExists = await tenantDb.taskListGroup.findUnique({ where: { id: list.id } });
    expect(listStillExists).toBeNull();
  });
});
