import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { hasEffectivePermission, resolveEffectivePermissions } from "../src/tenant/permissions/resolvePermissions";
import { computeEntitledFeatures } from "../src/tenant/entitlements/features";
import { ADMIN_SET_NAME, MANAGER_SET_NAME, STAFF_SET_NAME } from "../src/tenant/permissions/systemPermissionSets";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient } from "../src/generated/tenant-client/client.js";

let tenant: Tenant;
let tenantDb: PrismaClient;

beforeEach(async () => {
  const subdomain = `syspermsets-${Date.now()}`;
  // Default "small" plan: no custom_roles entitlement — this is exactly the
  // case T402 fixes: system permission sets must still work without Ultimate.
  await provisionTenant({ name: "System Permission Sets Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("System permission sets are available without the custom_roles entitlement (T402)", () => {
  it("an owner without an explicit customRoleId gets the Admin system set's full permissions", async () => {
    const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
    const entitled = computeEntitledFeatures("small", []);
    expect(entitled.has("custom_roles")).toBe(false);

    expect(await hasEffectivePermission(tenantDb, owner, entitled, "budgets_manage")).toBe(true);
    expect(await hasEffectivePermission(tenantDb, owner, entitled, "organization_settings_manage")).toBe(true);
    expect(await hasEffectivePermission(tenantDb, owner, entitled, "cost_rates_manage")).toBe(true);
  });

  it("a member without an explicit customRoleId gets the Staff system set (no elevated permissions)", async () => {
    const member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
    const entitled = computeEntitledFeatures("small", []);

    expect(await hasEffectivePermission(tenantDb, member, entitled, "budgets_manage")).toBe(false);
    expect(await hasEffectivePermission(tenantDb, member, entitled, "tasks_manage_all")).toBe(false);
  });

  it("self-heals the system permission sets on first access even if never seeded before", async () => {
    // No explicit seeding call — resolveEffectivePermissions must create them lazily.
    const rowsBefore = await tenantDb.customRole.count({ where: { isSystem: true } });
    expect(rowsBefore).toBe(0);

    const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
    await resolveEffectivePermissions(tenantDb, owner, computeEntitledFeatures("small", []));

    const rowsAfter = await tenantDb.customRole.count({ where: { isSystem: true } });
    expect(rowsAfter).toBe(8);
  });

  it("explicitly assigning a user to the Manager system set works without custom_roles entitlement", async () => {
    const member = await tenantDb.user.create({ data: { email: "manager@example.com", role: "member" } });
    const entitled = computeEntitledFeatures("small", []);
    // Trigger seeding, then look up the Manager set and assign it explicitly.
    await resolveEffectivePermissions(tenantDb, member, entitled);
    const managerSet = await tenantDb.customRole.findFirstOrThrow({ where: { name: MANAGER_SET_NAME, isSystem: true } });
    await tenantDb.user.update({ where: { id: member.id }, data: { customRoleId: managerSet.id } });
    const updated = await tenantDb.user.findUniqueOrThrow({ where: { id: member.id } });

    expect(await hasEffectivePermission(tenantDb, updated, entitled, "budgets_manage")).toBe(true);
    expect(await hasEffectivePermission(tenantDb, updated, entitled, "cost_rates_manage")).toBe(false);
    expect(await hasEffectivePermission(tenantDb, updated, entitled, "organization_settings_manage")).toBe(false);
  });

  it("a real (non-system) custom role still requires the custom_roles entitlement", async () => {
    const member = await tenantDb.user.create({ data: { email: "member2@example.com", role: "member" } });
    const customRole = await tenantDb.customRole.create({ data: { name: "Bespoke Role", permissions: ["budgets_manage"], isSystem: false } });
    await tenantDb.user.update({ where: { id: member.id }, data: { customRoleId: customRole.id } });
    const updated = await tenantDb.user.findUniqueOrThrow({ where: { id: member.id } });

    // Without the entitlement, the custom (non-system) role is ignored, and the
    // user falls back to their legacy-mapped system set (Staff, for `member`).
    const entitled = computeEntitledFeatures("small", []);
    expect(entitled.has("custom_roles")).toBe(false);
    expect(await hasEffectivePermission(tenantDb, updated, entitled, "budgets_manage")).toBe(false);
  });

  it("system permission sets cannot be edited or deleted via the roles API's underlying guard", async () => {
    await resolveEffectivePermissions(
      tenantDb,
      await tenantDb.user.create({ data: { email: "seed-trigger@example.com", role: "owner" } }),
      computeEntitledFeatures("small", []),
    );
    const adminSet = await tenantDb.customRole.findFirstOrThrow({ where: { name: ADMIN_SET_NAME, isSystem: true } });
    expect(adminSet.isSystem).toBe(true);
    const staffSet = await tenantDb.customRole.findFirstOrThrow({ where: { name: STAFF_SET_NAME, isSystem: true } });
    expect(staffSet.isSystem).toBe(true);
  });
});
