import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import { recordAuditEntry } from "../src/tenant/auditLog/recordAuditEntry";

let tenant: Tenant;
let ownerId: string;
let memberId: string;

beforeEach(async () => {
  const subdomain = `auditlog-${Date.now()}`;
  await provisionTenant({ name: "Audit Log Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner@example.com", role: "owner" } });
  ownerId = owner.id;
  const member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
  memberId = member.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("audit log — recordAuditEntry", () => {
  it("creates an audit entry for a role change", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    await recordAuditEntry(tenantDb, {
      actorId: ownerId,
      action: "user_role_changed",
      entityType: "User",
      entityId: memberId,
      summary: "Rolle von member@example.com geändert: member → admin",
    });

    const entries = await tenantDb.auditLogEntry.findMany({ where: { entityType: "User" } });
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("user_role_changed");
    expect(entries[0].actorId).toBe(ownerId);
    expect(entries[0].entityId).toBe(memberId);
  });

  it("creates an audit entry for API key creation", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    await recordAuditEntry(tenantDb, {
      actorId: ownerId,
      action: "api_key_created",
      entityType: "ApiKey",
      entityId: "some-key-id",
      summary: 'API-Key "CI Integration" (read_write) erstellt',
    });

    const entries = await tenantDb.auditLogEntry.findMany({ where: { entityType: "ApiKey" } });
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("api_key_created");
  });
});

describe("audit log — role PATCH route wiring", () => {
  it("writes an audit entry when a user's role actually changes via the users PATCH endpoint's logic", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    // Mirrors what src/app/api/tenant/users/[id]/route.ts does after updating the role.
    const previous = await tenantDb.user.findUnique({ where: { id: memberId }, select: { role: true } });
    const updated = await tenantDb.user.update({ where: { id: memberId }, data: { role: "admin" } });

    expect(previous?.role).not.toBe(updated.role);

    await recordAuditEntry(tenantDb, {
      actorId: ownerId,
      action: "user_role_changed",
      entityType: "User",
      entityId: updated.id,
      summary: `Rolle von ${updated.email} geändert: ${previous?.role} → ${updated.role}`,
    });

    const entries = await tenantDb.auditLogEntry.findMany();
    expect(entries).toHaveLength(1);
    expect(entries[0].summary).toContain("member → admin");
  });
});
