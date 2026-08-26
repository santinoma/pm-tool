import { describe, expect, it } from "vitest";
import { computeEffectivePermissions, hasPermission } from "../src/tenant/permissions/permissionCatalog";

describe("computeEffectivePermissions — legacy fallback", () => {
  it("grants owner/admin every permission when no custom role is assigned", () => {
    const owner = computeEffectivePermissions({
      baseRole: "owner",
      hasCustomRolesFeature: false,
      hasProjectOverridesFeature: false,
    });
    expect(hasPermission(owner, "budgets_manage")).toBe(true);
    expect(hasPermission(owner, "members_manage_roles")).toBe(true);

    const admin = computeEffectivePermissions({
      baseRole: "admin",
      hasCustomRolesFeature: false,
      hasProjectOverridesFeature: false,
    });
    expect(hasPermission(admin, "automations_manage")).toBe(true);
  });

  it("grants member/client none of the new granular permissions", () => {
    const member = computeEffectivePermissions({
      baseRole: "member",
      hasCustomRolesFeature: false,
      hasProjectOverridesFeature: false,
    });
    expect(member.size).toBe(0);

    const client = computeEffectivePermissions({
      baseRole: "client",
      hasCustomRolesFeature: false,
      hasProjectOverridesFeature: false,
    });
    expect(client.size).toBe(0);
  });
});

describe("computeEffectivePermissions — custom role", () => {
  it("uses the custom role's permission set when the feature is entitled", () => {
    const effective = computeEffectivePermissions({
      baseRole: "member",
      customRolePermissions: ["budgets_manage", "automations_manage"],
      hasCustomRolesFeature: true,
      hasProjectOverridesFeature: false,
    });
    expect(hasPermission(effective, "budgets_manage")).toBe(true);
    expect(hasPermission(effective, "automations_manage")).toBe(true);
    expect(hasPermission(effective, "members_manage_roles")).toBe(false);
  });

  it("ignores the custom role when the feature is not entitled, falling back to the base role", () => {
    const effective = computeEffectivePermissions({
      baseRole: "member",
      customRolePermissions: ["budgets_manage"],
      hasCustomRolesFeature: false,
      hasProjectOverridesFeature: false,
    });
    expect(effective.size).toBe(0);
  });

  it("filters out unknown permission strings from a stored custom role", () => {
    const effective = computeEffectivePermissions({
      baseRole: "member",
      customRolePermissions: ["budgets_manage", "not_a_real_permission"],
      hasCustomRolesFeature: true,
      hasProjectOverridesFeature: false,
    });
    expect(effective.size).toBe(1);
    expect(hasPermission(effective, "budgets_manage")).toBe(true);
  });
});

describe("computeEffectivePermissions — project override precedence", () => {
  it("prefers the project override over the tenant-wide custom role", () => {
    const effective = computeEffectivePermissions({
      baseRole: "member",
      customRolePermissions: ["budgets_manage"],
      projectOverridePermissions: ["projects_manage"],
      hasCustomRolesFeature: true,
      hasProjectOverridesFeature: true,
    });
    expect(hasPermission(effective, "projects_manage")).toBe(true);
    expect(hasPermission(effective, "budgets_manage")).toBe(false);
  });

  it("falls back to the custom role when the override feature is not entitled", () => {
    const effective = computeEffectivePermissions({
      baseRole: "member",
      customRolePermissions: ["budgets_manage"],
      projectOverridePermissions: ["projects_manage"],
      hasCustomRolesFeature: true,
      hasProjectOverridesFeature: false,
    });
    expect(hasPermission(effective, "budgets_manage")).toBe(true);
    expect(hasPermission(effective, "projects_manage")).toBe(false);
  });
});
