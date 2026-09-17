import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { DELETE as deleteFolder, PATCH as patchFolder } from "@/app/api/tenant/task-folders/[id]/route";
import { DELETE as deleteList, PATCH as patchList } from "@/app/api/tenant/task-list-groups/[id]/route";
import { GET as getFolders } from "@/app/api/tenant/task-folders/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let owner: User;
let projectId: string;
let statusId: string;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, { method, body: body !== undefined ? JSON.stringify(body) : undefined });
}

beforeEach(async () => {
  const subdomain = `taskfolders-${Date.now()}`;
  await provisionTenant({ name: "Task Folders Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  const project = await tenantDb.project.create({ data: { name: "Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
  const status = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  statusId = status.id;
  setCurrentUser(owner);
});

afterEach(async () => {
  vi.clearAllMocks();
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("task folders and lists", () => {
  it("creates a folder, a list inside it, and assigns a task to the list", async () => {
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
});

describe("T404.1: archiving instead of hard-deleting folders/lists (Productive parity)", () => {
  it("DELETE on a list archives it instead of removing it, keeping its tasks' list assignment intact", async () => {
    const folder = await tenantDb.taskFolder.create({ data: { projectId, name: "Phase 1", position: 0 } });
    const list = await tenantDb.taskListGroup.create({ data: { folderId: folder.id, name: "Sprint 1", position: 0 } });
    const task = await tenantDb.task.create({
      data: { title: "Task in list", statusId, taskListGroupId: list.id, projects: { create: { projectId, isPrimary: true } } },
    });

    const response = await deleteList(jsonRequest(`http://tenant.local/api/tenant/task-list-groups/${list.id}`, "DELETE"), {
      params: Promise.resolve({ id: list.id }),
    });
    expect(response.status).toBe(200);

    const reloadedList = await tenantDb.taskListGroup.findUnique({ where: { id: list.id } });
    expect(reloadedList).not.toBeNull();
    expect(reloadedList?.archived).toBe(true);

    // T404.1's core point: the list still exists, and tasks keep their reference —
    // unlike the old hard-delete behavior, which nulled taskListGroupId.
    const reloadedTask = await tenantDb.task.findUnique({ where: { id: task.id } });
    expect(reloadedTask?.taskListGroupId).toBe(list.id);
  });

  it("PATCH { archived: false } restores an archived list", async () => {
    const folder = await tenantDb.taskFolder.create({ data: { projectId, name: "Phase 1", position: 0 } });
    const list = await tenantDb.taskListGroup.create({ data: { folderId: folder.id, name: "Sprint 1", position: 0, archived: true } });

    const response = await patchList(
      jsonRequest(`http://tenant.local/api/tenant/task-list-groups/${list.id}`, "PATCH", { archived: false }),
      { params: Promise.resolve({ id: list.id }) },
    );
    expect(response.status).toBe(200);

    const reloadedList = await tenantDb.taskListGroup.findUnique({ where: { id: list.id } });
    expect(reloadedList?.archived).toBe(false);
  });

  it("DELETE on a folder archives it AND cascades archiving to its lists (no more 409-on-non-empty guard)", async () => {
    const folder = await tenantDb.taskFolder.create({ data: { projectId, name: "Phase 1", position: 0 } });
    const list = await tenantDb.taskListGroup.create({ data: { folderId: folder.id, name: "Sprint 1", position: 0 } });

    const response = await deleteFolder(jsonRequest(`http://tenant.local/api/tenant/task-folders/${folder.id}`, "DELETE"), {
      params: Promise.resolve({ id: folder.id }),
    });
    expect(response.status).toBe(200);

    const reloadedFolder = await tenantDb.taskFolder.findUnique({ where: { id: folder.id } });
    expect(reloadedFolder?.archived).toBe(true);
    const reloadedList = await tenantDb.taskListGroup.findUnique({ where: { id: list.id } });
    expect(reloadedList?.archived).toBe(true);
  });

  it("restoring a folder does NOT auto-restore its (individually archived) lists", async () => {
    const folder = await tenantDb.taskFolder.create({ data: { projectId, name: "Phase 1", position: 0, archived: true } });
    const list = await tenantDb.taskListGroup.create({ data: { folderId: folder.id, name: "Sprint 1", position: 0, archived: true } });

    const response = await patchFolder(
      jsonRequest(`http://tenant.local/api/tenant/task-folders/${folder.id}`, "PATCH", { archived: false }),
      { params: Promise.resolve({ id: folder.id }) },
    );
    expect(response.status).toBe(200);

    const reloadedFolder = await tenantDb.taskFolder.findUnique({ where: { id: folder.id } });
    expect(reloadedFolder?.archived).toBe(false);
    const reloadedList = await tenantDb.taskListGroup.findUnique({ where: { id: list.id } });
    expect(reloadedList?.archived).toBe(true);
  });

  it("GET /api/tenant/task-folders (active view) excludes archived folders and archived lists inside active folders", async () => {
    const activeFolder = await tenantDb.taskFolder.create({ data: { projectId, name: "Active Folder", position: 0 } });
    await tenantDb.taskListGroup.create({ data: { folderId: activeFolder.id, name: "Active List", position: 0 } });
    await tenantDb.taskListGroup.create({ data: { folderId: activeFolder.id, name: "Archived List", position: 1, archived: true } });
    await tenantDb.taskFolder.create({ data: { projectId, name: "Archived Folder", position: 1, archived: true } });

    const response = await getFolders(new Request(`http://tenant.local/api/tenant/task-folders?projectId=${projectId}`));
    expect(response.status).toBe(200);
    const { folders } = await response.json();

    expect(folders).toHaveLength(1);
    expect(folders[0].name).toBe("Active Folder");
    expect(folders[0].lists).toHaveLength(1);
    expect(folders[0].lists[0].name).toBe("Active List");
  });
});
