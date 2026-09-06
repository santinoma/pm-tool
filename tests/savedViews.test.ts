import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { GET, POST } from "@/app/api/tenant/saved-views/route";
import { PATCH, DELETE } from "@/app/api/tenant/saved-views/[id]/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let projectId: string;
let owner: User;
let member: User;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

function jsonRequest(body: unknown) {
  return new Request("http://tenant.local/api/tenant/saved-views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  const subdomain = `savedviews-${Date.now()}`;
  await provisionTenant({ name: "Saved Views Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
  const project = await tenantDb.project.create({ data: { name: "Project" } });
  projectId = project.id;
  // Both users are project members so assertSingleProjectAccess passes for either.
  await tenantDb.projectMember.create({ data: { projectId, userId: owner.id } });
  await tenantDb.projectMember.create({ data: { projectId, userId: member.id } });
});

afterEach(async () => {
  vi.clearAllMocks();
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("POST /api/tenant/saved-views", () => {
  it("creates a project-scoped saved view", async () => {
    setCurrentUser(owner);
    const response = await POST(
      jsonRequest({
        scope: "project",
        projectId,
        name: "Board Filter",
        viewType: "board",
        filterConfig: { statusFilter: "Todo" },
        sortConfig: { sortKey: "dueDate" },
        sharedWithAll: true,
      }),
    );
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.view.scope).toBe("project");
    expect(data.view.projectId).toBe(projectId);
    expect(data.view.ownerId).toBe(owner.id);
    expect(data.view.sharedWithAll).toBe(true);
  });

  it("creates a my_tasks-scoped saved view without a project", async () => {
    setCurrentUser(owner);
    const response = await POST(
      jsonRequest({
        scope: "my_tasks",
        name: "Overdue mine",
        viewType: "list",
        filterConfig: { assigneeId: "__ME__" },
      }),
    );
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.view.scope).toBe("my_tasks");
    expect(data.view.projectId).toBeNull();
    expect(data.view.filterConfig).toEqual({ assigneeId: "__ME__" });
  });

  it("rejects sharedWithAll:true for a my_tasks-scoped view", async () => {
    setCurrentUser(owner);
    const response = await POST(
      jsonRequest({
        scope: "my_tasks",
        name: "Nope",
        viewType: "list",
        filterConfig: {},
        sharedWithAll: true,
      }),
    );
    expect(response.status).toBe(400);
    const count = await tenantDb.savedView.count({ where: { scope: "my_tasks" } });
    expect(count).toBe(0);
  });
});

describe("GET /api/tenant/saved-views — visibility", () => {
  it("lets a second user see a sharedWithAll project view but not another user's private view", async () => {
    setCurrentUser(owner);
    await POST(
      jsonRequest({
        scope: "project",
        projectId,
        name: "Team Board",
        viewType: "board",
        filterConfig: {},
        sharedWithAll: true,
      }),
    );
    await POST(
      jsonRequest({
        scope: "project",
        projectId,
        name: "Owner's Private List",
        viewType: "list",
        filterConfig: {},
        sharedWithAll: false,
      }),
    );

    setCurrentUser(member);
    const response = await GET(new Request(`http://tenant.local/api/tenant/saved-views?projectId=${projectId}`));
    expect(response.status).toBe(200);
    const data = await response.json();
    const names = data.views.map((v: { name: string }) => v.name);
    expect(names).toContain("Team Board");
    expect(names).not.toContain("Owner's Private List");
  });

  it("keeps my_tasks views strictly private to their owner", async () => {
    setCurrentUser(owner);
    await POST(
      jsonRequest({
        scope: "my_tasks",
        name: "Owner's My Tasks View",
        viewType: "list",
        filterConfig: { assigneeId: "__ME__" },
      }),
    );

    setCurrentUser(member);
    const response = await GET(new Request("http://tenant.local/api/tenant/saved-views?scope=my_tasks"));
    const data = await response.json();
    expect(data.views).toHaveLength(0);

    setCurrentUser(owner);
    const ownResponse = await GET(new Request("http://tenant.local/api/tenant/saved-views?scope=my_tasks"));
    const ownData = await ownResponse.json();
    expect(ownData.views).toHaveLength(1);
  });
});

describe("PATCH/DELETE /api/tenant/saved-views/[id]", () => {
  async function createOwnedView() {
    setCurrentUser(owner);
    const response = await POST(
      jsonRequest({
        scope: "project",
        projectId,
        name: "Editable View",
        viewType: "list",
        filterConfig: {},
      }),
    );
    const data = await response.json();
    return data.view.id as string;
  }

  it("lets the owner rename a view", async () => {
    const id = await createOwnedView();
    setCurrentUser(owner);
    const response = await PATCH(
      new Request(`http://tenant.local/api/tenant/saved-views/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.view.name).toBe("Renamed");
  });

  it("rejects a non-owner, non-admin from updating or deleting the view", async () => {
    const id = await createOwnedView();
    setCurrentUser(member);
    const patchResponse = await PATCH(
      new Request(`http://tenant.local/api/tenant/saved-views/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hijacked" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(patchResponse.status).toBe(403);

    const deleteResponse = await DELETE(new Request(`http://tenant.local/api/tenant/saved-views/${id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id }),
    });
    expect(deleteResponse.status).toBe(403);
  });

  it("lets the owner delete the view", async () => {
    const id = await createOwnedView();
    setCurrentUser(owner);
    const response = await DELETE(new Request(`http://tenant.local/api/tenant/saved-views/${id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(200);
    const found = await tenantDb.savedView.findUnique({ where: { id } });
    expect(found).toBeNull();
  });
});
