import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { GET as listTeams, POST as createTeam } from "@/app/api/tenant/teams/route";
import { DELETE as deleteTeam } from "@/app/api/tenant/teams/[id]/route";
import { POST as addMember, DELETE as removeMember } from "@/app/api/tenant/teams/[id]/members/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let owner: User;
let member: User;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

beforeEach(async () => {
  const subdomain = `teams-${Date.now()}`;
  await provisionTenant({ name: "Teams Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
});

afterEach(async () => {
  vi.clearAllMocks();
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

function jsonRequest(body: unknown) {
  return new Request("http://tenant.local/api/tenant/teams", { method: "POST", body: JSON.stringify(body) });
}

describe("Teams (T314)", () => {
  it("a member without manage permission cannot create a team", async () => {
    setCurrentUser(member);
    const response = await createTeam(jsonRequest({ name: "Design" }));
    expect(response.status).toBe(403);
  });

  it("an owner can create a team, add and remove members, and see it in the listing", async () => {
    setCurrentUser(owner);
    const createResponse = await createTeam(jsonRequest({ name: "Design" }));
    expect(createResponse.status).toBe(201);
    const { team } = await createResponse.json();

    const addResponse = await addMember(jsonRequest({ userId: member.id }), { params: Promise.resolve({ id: team.id }) });
    expect(addResponse.status).toBe(201);

    const listResponse = await listTeams();
    const { teams } = await listResponse.json();
    const designTeam = teams.find((t: { id: string }) => t.id === team.id);
    expect(designTeam.members).toEqual([{ id: member.id, label: member.email }]);

    const removeResponse = await removeMember(jsonRequest({ userId: member.id }), { params: Promise.resolve({ id: team.id }) });
    expect(removeResponse.status).toBe(200);

    const listAfterRemove = await (await listTeams()).json();
    const designAfterRemove = listAfterRemove.teams.find((t: { id: string }) => t.id === team.id);
    expect(designAfterRemove.members).toEqual([]);
  });

  it("allows one user to belong to multiple teams", async () => {
    setCurrentUser(owner);
    const teamA = await (await createTeam(jsonRequest({ name: "Design" }))).json();
    const teamB = await (await createTeam(jsonRequest({ name: "Backend" }))).json();

    await addMember(jsonRequest({ userId: member.id }), { params: Promise.resolve({ id: teamA.team.id }) });
    await addMember(jsonRequest({ userId: member.id }), { params: Promise.resolve({ id: teamB.team.id }) });

    const memberships = await tenantDb.teamMember.findMany({ where: { userId: member.id } });
    expect(memberships).toHaveLength(2);
  });

  it("deleting a team removes the group but not the users", async () => {
    setCurrentUser(owner);
    const team = await (await createTeam(jsonRequest({ name: "Design" }))).json();
    await addMember(jsonRequest({ userId: member.id }), { params: Promise.resolve({ id: team.team.id }) });

    const deleteResponse = await deleteTeam(new Request("http://tenant.local/api/tenant/teams/x", { method: "DELETE" }), {
      params: Promise.resolve({ id: team.team.id }),
    });
    expect(deleteResponse.status).toBe(200);

    const stillExists = await tenantDb.user.findUnique({ where: { id: member.id } });
    expect(stillExists).not.toBeNull();
    const remainingMemberships = await tenantDb.teamMember.findMany({ where: { teamId: team.team.id } });
    expect(remainingMemberships).toHaveLength(0);
  });
});
