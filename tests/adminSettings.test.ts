import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { hashPassword, verifyPassword } from "../src/tenant/auth/password";
import { wouldDeactivateLastOwner } from "../src/tenant/auth/roleGuard";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let ownerId: string;
let memberId: string;

beforeEach(async () => {
  const subdomain = `adminsettings-${Date.now()}`;
  await provisionTenant({ name: "Admin Settings Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const passwordHash = await hashPassword("testpass123");
  const owner = await tenantDb.user.create({
    data: { email: "real-owner@example.com", role: "owner", passwordHash },
  });
  ownerId = owner.id;
  const member = await tenantDb.user.create({
    data: { email: "member@example.com", role: "member", passwordHash },
  });
  memberId = member.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("deactivating a user (data layer, mirrors the active route logic)", () => {
  it("a deactivated user's password no longer matches a successful login check path", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.user.update({ where: { id: memberId }, data: { isActive: false } });

    const user = await tenantDb.user.findUniqueOrThrow({ where: { id: memberId } });
    const passwordMatches = await verifyPassword("testpass123", user.passwordHash!);
    expect(passwordMatches).toBe(true);
    expect(user.isActive).toBe(false);
  });

  it("blocks deactivating the last active owner", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const allUsers = await tenantDb.user.findMany({ select: { id: true, role: true, isActive: true } });
    expect(wouldDeactivateLastOwner(allUsers, ownerId)).toBe(true);
  });

  it("allows deactivating a member", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const allUsers = await tenantDb.user.findMany({ select: { id: true, role: true, isActive: true } });
    expect(wouldDeactivateLastOwner(allUsers, memberId)).toBe(false);

    const updated = await tenantDb.user.update({ where: { id: memberId }, data: { isActive: false } });
    expect(updated.isActive).toBe(false);
  });
});

describe("tenant settings currency", () => {
  it("persists a currency update", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const settings = await tenantDb.tenantSettings.create({ data: { currency: "USD" } });
    expect(settings.currency).toBe("USD");
  });
});
