import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { getOrCreateSystemPermissionSets, ADMIN_SET_NAME, MANAGER_SET_NAME, PROFITABILITY_MANAGER_SET_NAME, COORDINATOR_SET_NAME, STAFF_SET_NAME, CLIENT_LEAD_SET_NAME } from "../src/tenant/permissions/systemPermissionSets";
import { computeEntitledFeatures } from "../src/tenant/entitlements/features";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { PATCH as patchCustomRole } from "@/app/api/tenant/users/[id]/custom-role/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let manager: User;
let staff: User;
let target: User;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: computeEntitledFeatures("small", []),
  });
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, { method: "PATCH", body: JSON.stringify(body) });
}

async function setNameOfCustomRole(name: string) {
  return tenantDb.customRole.findFirstOrThrow({ where: { name, isSystem: true } });
}

beforeEach(async () => {
  const subdomain = `roletiering-${Date.now()}`;
  await provisionTenant({ name: "Role Tiering Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);
  await getOrCreateSystemPermissionSets(tenantDb);

  const managerSet = await setNameOfCustomRole(MANAGER_SET_NAME);
  const staffSet = await setNameOfCustomRole(STAFF_SET_NAME);
  manager = await tenantDb.user.create({ data: { email: "manager@example.com", role: "member", customRoleId: managerSet.id } });
  staff = await tenantDb.user.create({ data: { email: "staff@example.com", role: "member", customRoleId: staffSet.id } });
  target = await tenantDb.user.create({ data: { email: "target@example.com", role: "member", customRoleId: staffSet.id } });
});

afterEach(async () => {
  vi.clearAllMocks();
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Tiered permission-set assignment (T403)", () => {
  it("Staff (no members_manage_roles) cannot change anyone's permission set", async () => {
    setCurrentUser(staff);
    const coordinatorSet = await setNameOfCustomRole(COORDINATOR_SET_NAME);
    const response = await patchCustomRole(
      jsonRequest(`http://tenant.local/api/tenant/users/${target.id}/custom-role`, { customRoleId: coordinatorSet.id }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(response.status).toBe(403);
  });

  it("Manager can promote a user to Coordinator (permissions are a subset of Manager's)", async () => {
    setCurrentUser(manager);
    const coordinatorSet = await setNameOfCustomRole(COORDINATOR_SET_NAME);
    const response = await patchCustomRole(
      jsonRequest(`http://tenant.local/api/tenant/users/${target.id}/custom-role`, { customRoleId: coordinatorSet.id }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(response.status).toBe(200);
  });

  it("Manager can promote a user to Client Lead (empty permission set is always a subset)", async () => {
    setCurrentUser(manager);
    const clientLeadSet = await setNameOfCustomRole(CLIENT_LEAD_SET_NAME);
    const response = await patchCustomRole(
      jsonRequest(`http://tenant.local/api/tenant/users/${target.id}/custom-role`, { customRoleId: clientLeadSet.id }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(response.status).toBe(200);
  });

  it("Manager cannot promote a user to Admin (organization_settings_manage is not in Manager's own permissions)", async () => {
    setCurrentUser(manager);
    const adminSet = await setNameOfCustomRole(ADMIN_SET_NAME);
    const response = await patchCustomRole(
      jsonRequest(`http://tenant.local/api/tenant/users/${target.id}/custom-role`, { customRoleId: adminSet.id }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/mehr Rechten/);
  });

  it("Manager cannot promote a user to Profitability Manager (cost_rates_manage is not in Manager's own permissions)", async () => {
    setCurrentUser(manager);
    const profitabilityManagerSet = await setNameOfCustomRole(PROFITABILITY_MANAGER_SET_NAME);
    const response = await patchCustomRole(
      jsonRequest(`http://tenant.local/api/tenant/users/${target.id}/custom-role`, { customRoleId: profitabilityManagerSet.id }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(response.status).toBe(403);
  });

  it("Admin (full legacy permissions) can promote a user all the way to Admin", async () => {
    const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
    setCurrentUser(owner);
    const adminSet = await setNameOfCustomRole(ADMIN_SET_NAME);
    const response = await patchCustomRole(
      jsonRequest(`http://tenant.local/api/tenant/users/${target.id}/custom-role`, { customRoleId: adminSet.id }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(response.status).toBe(200);
  });

  it("a bespoke custom role with permissions the actor lacks is also blocked, not just system sets", async () => {
    setCurrentUser(manager);
    const bespokeRole = await tenantDb.customRole.create({
      data: { name: "Org Settings Peeker", permissions: ["organization_settings_manage"], isSystem: false },
    });
    const response = await patchCustomRole(
      jsonRequest(`http://tenant.local/api/tenant/users/${target.id}/custom-role`, { customRoleId: bespokeRole.id }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(response.status).toBe(403);
  });
});
