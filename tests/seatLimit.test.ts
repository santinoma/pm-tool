import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { countPaidSeats } from "../src/tenant/billing/seats";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { POST as CREATE_INVITE } from "@/app/api/tenant/invites/route";
import { PATCH as PATCH_TENANT } from "@/app/api/tenants/[id]/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let owner: User;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

function inviteRequest(body: unknown) {
  return CREATE_INVITE(
    new Request("http://tenant.local/api/tenant/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenant.id, "x-tenant-subdomain": tenant.subdomain },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(async () => {
  const subdomain = `seatlimit-${Date.now()}`;
  await provisionTenant({ name: "Seat Limit Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);
  owner = await tenantDb.user.create({ data: { email: "owner@example.com", role: "owner" } });
  // provisionTenant leaves a still-pending "owner" invite from provisioning itself
  // (never accepted in these tests) — clear it so seat counting starts from a known
  // baseline of exactly one paid seat (the owner user created above).
  await tenantDb.invite.deleteMany({});
  setCurrentUser(owner);
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Seat limit enforcement on invites", () => {
  it("allows an invite for a paid role when no seatLimit is set", async () => {
    const response = await inviteRequest({ email: "a@example.com", role: "member" });
    expect(response.status).toBe(201);
  });

  it("blocks a paid-role invite once the seat limit is reached", async () => {
    // provisionTenant already created 1 owner -> seatLimit of 1 is already full.
    await platformDb.tenant.update({ where: { id: tenant.id }, data: { seatLimit: 1 } });

    const response = await inviteRequest({ email: "b@example.com", role: "member" });
    expect(response.status).toBe(402);
    const body = await response.json();
    expect(body.error).toContain("Sitzplatz-Limit");
  });

  it("does not count the free client role against the seat limit", async () => {
    await platformDb.tenant.update({ where: { id: tenant.id }, data: { seatLimit: 1 } });
    vi.mocked(getTenantContext).mockResolvedValue({
      tenantDb,
      currentUser: owner,
      entitledFeatures: new Set(["client_portal"]),
    });

    const project = await tenantDb.project.create({
      data: { name: "Client Project", workflow: { create: { name: "Test Workflow" } } },
    });
    const response = await inviteRequest({ email: "client@example.com", role: "client", grantedProjectIds: [project.id] });
    expect(response.status).toBe(201);
  });

  it("counts pending invites toward the seat limit, not just active users", async () => {
    await platformDb.tenant.update({ where: { id: tenant.id }, data: { seatLimit: 2 } });

    const first = await inviteRequest({ email: "c@example.com", role: "member" });
    expect(first.status).toBe(201);

    const second = await inviteRequest({ email: "d@example.com", role: "member" });
    expect(second.status).toBe(402);
  });

  it("countPaidSeats excludes the client role and expired invites", async () => {
    await tenantDb.user.create({ data: { email: "client-user@example.com", role: "client" } });
    await tenantDb.invite.create({
      data: { email: "expired@example.com", role: "member", token: "expired-token", expiresAt: new Date(Date.now() - 1000) },
    });

    const count = await countPaidSeats(tenantDb);
    expect(count).toBe(1); // just the seeded owner
  });
});

describe("Platform admin: seat limit editing", () => {
  it("sets and clears a tenant's seat limit via PATCH", async () => {
    const setResponse = await PATCH_TENANT(
      new Request(`http://admin.local/api/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatLimit: 5 }),
      }),
      { params: Promise.resolve({ id: tenant.id }) },
    );
    expect(setResponse.status).toBe(200);
    const setBody = await setResponse.json();
    expect(setBody.tenant.seatLimit).toBe(5);

    const clearResponse = await PATCH_TENANT(
      new Request(`http://admin.local/api/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatLimit: null }),
      }),
      { params: Promise.resolve({ id: tenant.id }) },
    );
    expect(clearResponse.status).toBe(200);
    const clearBody = await clearResponse.json();
    expect(clearBody.tenant.seatLimit).toBeNull();
  });

  it("rejects a negative seat limit", async () => {
    const response = await PATCH_TENANT(
      new Request(`http://admin.local/api/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatLimit: -1 }),
      }),
      { params: Promise.resolve({ id: tenant.id }) },
    );
    expect(response.status).toBe(400);
  });
});
