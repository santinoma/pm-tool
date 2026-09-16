import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { POST as CREATE_FIELD } from "@/app/api/tenant/custom-fields/route";
import { DELETE as DELETE_FIELD } from "@/app/api/tenant/custom-fields/[id]/route";

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

function createFieldRequest(body: unknown) {
  return CREATE_FIELD(
    new Request("http://tenant.local/api/tenant/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(async () => {
  const subdomain = `employeefields-${Date.now()}`;
  await provisionTenant({ name: "Employee Fields Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner@example.com", role: "owner" } });
  member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Employee Fields (CustomFieldDef entityType='user')", () => {
  it("creates an org-wide user-scoped field, not tied to any project", async () => {
    setCurrentUser(owner);
    const response = await createFieldRequest({
      key: "personnel_number",
      label: "Personalnummer",
      type: "text",
      entityType: "user",
    });
    expect(response.status).toBe(201);
    const { field } = await response.json();
    expect(field.entityType).toBe("user");
    expect(field.projectId).toBeNull();
    expect(field.library).toBe(true);
  });

  it("denies non-managers from creating an Employee Field", async () => {
    setCurrentUser(member);
    const response = await createFieldRequest({ key: "x", label: "X", type: "text", entityType: "user" });
    expect(response.status).toBe(403);
  });

  it("stores and reads a value for a specific user", async () => {
    setCurrentUser(owner);
    const created = await tenantDb.customFieldDef.create({
      data: { library: true, entityType: "user", key: "contract_type", label: "Vertragsart", type: "select", options: ["Vollzeit", "Teilzeit"] },
    });

    const value = await tenantDb.userCustomFieldValue.create({
      data: { fieldId: created.id, userId: member.id, value: "Vollzeit" },
    });
    expect(value.value).toBe("Vollzeit");

    const fetched = await tenantDb.userCustomFieldValue.findUnique({
      where: { fieldId_userId: { fieldId: created.id, userId: member.id } },
    });
    expect(fetched?.value).toBe("Vollzeit");
  });

  it("deleting the field definition is blocked only by project attachments, not by having values", async () => {
    setCurrentUser(owner);
    const created = await tenantDb.customFieldDef.create({
      data: { library: true, entityType: "user", key: "location", label: "Standort", type: "text", options: [] },
    });

    const response = await DELETE_FIELD(
      new Request(`http://tenant.local/api/tenant/custom-fields/${created.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(response.status).toBe(200);

    const stillExists = await tenantDb.customFieldDef.findUnique({ where: { id: created.id } });
    expect(stillExists).toBeNull();
  });
});
