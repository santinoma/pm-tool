import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { wouldCreateManagerCycle } from "../src/tenant/org/managerHierarchy";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { PATCH } from "@/app/api/tenant/users/[id]/route";

let tenant: Tenant;
let userAId: string;
let userBId: string;
let userCId: string;
let ownerUser: User;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb: getTenantDbClient(tenant.dbUrl),
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

beforeEach(async () => {
  const subdomain = `manager-${Date.now()}`;
  await provisionTenant({ name: "Manager Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const userA = await tenantDb.user.create({ data: { email: "a@example.com", role: "member" } });
  userAId = userA.id;
  const userB = await tenantDb.user.create({ data: { email: "b@example.com", role: "member" } });
  userBId = userB.id;
  const userC = await tenantDb.user.create({ data: { email: "c@example.com", role: "member" } });
  userCId = userC.id;
  ownerUser = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("manager assignment — self-manager", () => {
  it("rejects a user being assigned as their own manager", async () => {
    const cycle = await wouldCreateManagerCycle(
      getTenantDbClient(tenant.dbUrl),
      userAId,
      userAId,
    );
    // wouldCreateManagerCycle treats self-assignment as a (trivial) cycle; the API route
    // additionally short-circuits with a dedicated 400 before ever calling this helper.
    expect(cycle).toBe(true);
  });
});

describe("manager assignment — cycle detection", () => {
  it("rejects assigning C as A's manager when A manages B and B manages C", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.user.update({ where: { id: userBId }, data: { managerId: userAId } });
    await tenantDb.user.update({ where: { id: userCId }, data: { managerId: userBId } });

    // A -> B -> C already exists. Assigning C as A's manager (A.managerId = C) would close
    // the loop A -> B -> C -> A.
    const cycle = await wouldCreateManagerCycle(tenantDb, userAId, userCId);
    expect(cycle).toBe(true);
  });

  it("allows a non-cyclical manager assignment", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.user.update({ where: { id: userBId }, data: { managerId: userAId } });

    const cycle = await wouldCreateManagerCycle(tenantDb, userCId, userAId);
    expect(cycle).toBe(false);
  });
});

describe("manager assignment — API route", () => {
  it("rejects self-manager assignment via PATCH /api/tenant/users/[id]", async () => {
    setCurrentUser(ownerUser);

    const request = new Request(`https://tenant.example.com/api/tenant/users/${userAId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: userAId }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: userAId }) });
    expect(response.status).toBe(400);
  });

  it("rejects a manager-cycle assignment", async () => {
    setCurrentUser(ownerUser);
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.user.update({ where: { id: userBId }, data: { managerId: userAId } });
    await tenantDb.user.update({ where: { id: userCId }, data: { managerId: userBId } });

    const request = new Request(`https://tenant.example.com/api/tenant/users/${userAId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: userCId }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: userAId }) });
    expect(response.status).toBe(400);
  });
});
