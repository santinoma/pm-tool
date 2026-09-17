import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { POST as createInvite } from "@/app/api/tenant/invites/route";
import { PATCH as patchUser } from "@/app/api/tenant/users/[id]/route";
import { PATCH as patchCustomRole } from "@/app/api/tenant/users/[id]/custom-role/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let owner: User;
let contractor: User;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, { method: "PATCH", body: JSON.stringify(body) });
}

beforeEach(async () => {
  const subdomain = `employmenttype-${Date.now()}`;
  await provisionTenant({ name: "Employment Type Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  contractor = await tenantDb.user.create({ data: { email: "contractor@example.com", role: "member", employmentType: "contractor" } });
});

afterEach(async () => {
  vi.clearAllMocks();
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Employees vs. Contractors enforcement (T315)", () => {
  it("rejects inviting a contractor as admin", async () => {
    setCurrentUser(owner);
    const response = await createInvite(
      new Request("http://tenant.local/api/tenant/invites", {
        method: "POST",
        body: JSON.stringify({ email: "new-contractor@example.com", role: "admin", employmentType: "contractor" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("allows inviting a contractor as member", async () => {
    setCurrentUser(owner);
    const response = await createInvite(
      new Request("http://tenant.local/api/tenant/invites", {
        method: "POST",
        body: JSON.stringify({ email: "new-contractor@example.com", role: "member", employmentType: "contractor" }),
      }),
    );
    expect(response.status).toBe(201);
    const { invite } = await response.json();
    expect(invite.employmentType).toBe("contractor");
  });

  it("rejects promoting an existing contractor to admin", async () => {
    setCurrentUser(owner);
    const response = await patchUser(jsonRequest(`http://tenant.local/api/tenant/users/${contractor.id}`, { role: "admin" }), {
      params: Promise.resolve({ id: contractor.id }),
    });
    expect(response.status).toBe(400);
  });

  it("rejects switching an existing admin to contractor employment type", async () => {
    const admin = await tenantDb.user.create({ data: { email: "admin@example.com", role: "admin" } });
    setCurrentUser(owner);
    const response = await patchUser(jsonRequest(`http://tenant.local/api/tenant/users/${admin.id}`, { employmentType: "contractor" }), {
      params: Promise.resolve({ id: admin.id }),
    });
    expect(response.status).toBe(400);
  });

  it("allows switching a member's employment type to contractor", async () => {
    const member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
    setCurrentUser(owner);
    const response = await patchUser(jsonRequest(`http://tenant.local/api/tenant/users/${member.id}`, { employmentType: "contractor" }), {
      params: Promise.resolve({ id: member.id }),
    });
    expect(response.status).toBe(200);
  });

  it("rejects assigning a custom role to a contractor", async () => {
    const customRole = await tenantDb.customRole.create({ data: { name: "Reviewer", permissions: [] } });
    setCurrentUser(owner);
    const response = await patchCustomRole(
      jsonRequest(`http://tenant.local/api/tenant/users/${contractor.id}/custom-role`, { customRoleId: customRole.id }),
      { params: Promise.resolve({ id: contractor.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("allows assigning a custom role to an employee", async () => {
    const employee = await tenantDb.user.create({ data: { email: "employee@example.com", role: "member" } });
    const customRole = await tenantDb.customRole.create({ data: { name: "Reviewer", permissions: [] } });
    setCurrentUser(owner);
    const response = await patchCustomRole(
      jsonRequest(`http://tenant.local/api/tenant/users/${employee.id}/custom-role`, { customRoleId: customRole.id }),
      { params: Promise.resolve({ id: employee.id }) },
    );
    expect(response.status).toBe(200);
  });
});
