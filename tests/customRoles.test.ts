import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { hasEffectivePermission } from "../src/tenant/permissions/resolvePermissions";
import { computeEntitledFeatures } from "../src/tenant/entitlements/features";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `customroles-${Date.now()}`;
  await provisionTenant({ name: "Custom Roles Kunde", subdomain, ownerEmail: "owner@example.com", plan: "enterprise" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Custom roles and permission resolution (data layer)", () => {
  it("a member without a custom role has no granular permissions", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const member = await tenantDb.user.create({ data: { email: "m1@example.com", role: "member" } });
    const entitled = computeEntitledFeatures("enterprise", []);

    const canManageBudgets = await hasEffectivePermission(tenantDb, member, entitled, "budgets_manage");
    expect(canManageBudgets).toBe(false);
  });

  it("a member with a custom role gets exactly that role's permissions", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const role = await tenantDb.customRole.create({
      data: { name: "Finance Lead", permissions: ["budgets_manage"] },
    });
    const member = await tenantDb.user.create({
      data: { email: "m2@example.com", role: "member", customRoleId: role.id },
    });
    const entitled = computeEntitledFeatures("enterprise", []);

    expect(await hasEffectivePermission(tenantDb, member, entitled, "budgets_manage")).toBe(true);
    expect(await hasEffectivePermission(tenantDb, member, entitled, "automations_manage")).toBe(false);
  });

  it("a project role override takes precedence over the tenant-wide custom role", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const tenantWideRole = await tenantDb.customRole.create({
      data: { name: "Viewer", permissions: [] },
    });
    const projectAdminRole = await tenantDb.customRole.create({
      data: { name: "Project Admin", permissions: ["workflows_manage"] },
    });
    const member = await tenantDb.user.create({
      data: { email: "m3@example.com", role: "member", customRoleId: tenantWideRole.id },
    });
    const project = await tenantDb.project.create({ data: { name: "Delegated", workflow: { create: { name: "Test Workflow" } } } });
    await tenantDb.projectRoleOverride.create({
      data: { projectId: project.id, userId: member.id, customRoleId: projectAdminRole.id },
    });
    const entitled = computeEntitledFeatures("enterprise", []);

    expect(await hasEffectivePermission(tenantDb, member, entitled, "workflows_manage", project.id)).toBe(true);
    expect(await hasEffectivePermission(tenantDb, member, entitled, "workflows_manage")).toBe(false);
  });

  it("ignores custom roles entirely when the tenant's plan lacks the feature", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const role = await tenantDb.customRole.create({
      data: { name: "Finance Lead", permissions: ["budgets_manage"] },
    });
    const member = await tenantDb.user.create({
      data: { email: "m4@example.com", role: "member", customRoleId: role.id },
    });
    const smallPlanEntitled = computeEntitledFeatures("small", []);

    expect(await hasEffectivePermission(tenantDb, member, smallPlanEntitled, "budgets_manage")).toBe(false);
  });

  it("owner/admin retain full legacy permissions regardless of custom roles", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const owner = await tenantDb.user.create({ data: { email: "o1@example.com", role: "owner" } });
    const entitled = computeEntitledFeatures("enterprise", []);

    expect(await hasEffectivePermission(tenantDb, owner, entitled, "budgets_manage")).toBe(true);
    expect(await hasEffectivePermission(tenantDb, owner, entitled, "members_manage_roles")).toBe(true);
  });
});

describe("T301-T304: Invoicing/Cost-Rate/Employee-Field granular permissions", () => {
  it("grants a 'Billing Clerk' role invoicing_manage without cost_rates_manage", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const role = await tenantDb.customRole.create({ data: { name: "Billing Clerk", permissions: ["invoicing_manage"] } });
    const member = await tenantDb.user.create({ data: { email: "clerk@example.com", role: "member", customRoleId: role.id } });
    const entitled = computeEntitledFeatures("enterprise", []);

    expect(await hasEffectivePermission(tenantDb, member, entitled, "invoicing_manage")).toBe(true);
    expect(await hasEffectivePermission(tenantDb, member, entitled, "cost_rates_manage")).toBe(false);
  });

  it("grants a 'Profitability Manager' role cost_rates_manage without invoicing_manage (T304)", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const role = await tenantDb.customRole.create({ data: { name: "Profitability Manager", permissions: ["cost_rates_manage"] } });
    const member = await tenantDb.user.create({ data: { email: "profit@example.com", role: "member", customRoleId: role.id } });
    const entitled = computeEntitledFeatures("enterprise", []);

    expect(await hasEffectivePermission(tenantDb, member, entitled, "cost_rates_manage")).toBe(true);
    expect(await hasEffectivePermission(tenantDb, member, entitled, "invoicing_manage")).toBe(false);
  });

  it("grants employee_fields_sensitive_view independently of members_manage_roles", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const role = await tenantDb.customRole.create({
      data: { name: "HR Viewer", permissions: ["employee_fields_sensitive_view"] },
    });
    const member = await tenantDb.user.create({ data: { email: "hr@example.com", role: "member", customRoleId: role.id } });
    const entitled = computeEntitledFeatures("enterprise", []);

    expect(await hasEffectivePermission(tenantDb, member, entitled, "employee_fields_sensitive_view")).toBe(true);
    expect(await hasEffectivePermission(tenantDb, member, entitled, "members_manage_roles")).toBe(false);
  });
});
