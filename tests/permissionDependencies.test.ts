import { describe, it, expect } from "vitest";
import {
  resolveWithDependencies,
  blockingDependents,
  type PermissionKey,
} from "@/tenant/permissions/permissionCatalog";

describe("resolveWithDependencies", () => {
  it("adds the single direct prerequisite of a permission", () => {
    const result = resolveWithDependencies(["members_manage_roles"]);
    expect(result).toEqual(expect.arrayContaining(["members_manage_roles", "members_invite"]));
    expect(result).toHaveLength(2);
  });

  it("walks the chain: automations_manage -> workflows_manage (T403: no longer -> projects_manage)", () => {
    // T403: workflows_manage no longer requires projects_manage (Coordinator gets full
    // workflow/automation access without project CRUD rights, per Productive's docs).
    const result = resolveWithDependencies(["automations_manage"]);
    expect(new Set(result)).toEqual(new Set<PermissionKey>(["automations_manage", "workflows_manage"]));
    expect(result).not.toContain("projects_manage");
  });

  it("returns just the permission itself when it has no dependencies", () => {
    const result = resolveWithDependencies(["organization_settings_manage"]);
    expect(result).toEqual(["organization_settings_manage"]);
  });

  it("dedupes a shared prerequisite across multiple selected permissions", () => {
    const result = resolveWithDependencies(["tasks_manage_all", "budgets_manage", "portfolios_manage"]);
    const set = new Set(result);
    expect(set).toEqual(
      new Set<PermissionKey>(["tasks_manage_all", "budgets_manage", "portfolios_manage", "projects_manage"]),
    );
    // projects_manage should appear exactly once despite being a prerequisite of three keys
    expect(result.filter((k) => k === "projects_manage")).toHaveLength(1);
  });

  it("handles an empty selection", () => {
    expect(resolveWithDependencies([])).toEqual([]);
  });

  it("resolves integrations_manage to require organization_settings_manage", () => {
    const result = resolveWithDependencies(["integrations_manage"]);
    expect(new Set(result)).toEqual(
      new Set<PermissionKey>(["integrations_manage", "organization_settings_manage"]),
    );
  });

  it("resolves invoicing_manage and cost_rates_manage independently (T304: Manager vs Profitability Manager)", () => {
    const invoicing = resolveWithDependencies(["invoicing_manage"]);
    expect(new Set(invoicing)).toEqual(new Set<PermissionKey>(["invoicing_manage", "budgets_manage", "projects_manage"]));
    // cost_rates_manage does not require invoicing_manage, and vice versa — the two
    // are independently grantable, matching Productive's Manager/Profitability Manager split.
    expect(invoicing).not.toContain("cost_rates_manage");

    const costRates = resolveWithDependencies(["cost_rates_manage"]);
    expect(new Set(costRates)).toEqual(new Set<PermissionKey>(["cost_rates_manage", "budgets_manage", "projects_manage"]));
    expect(costRates).not.toContain("invoicing_manage");
  });

  it("resolves employee_fields_sensitive_view to require members_invite", () => {
    const result = resolveWithDependencies(["employee_fields_sensitive_view"]);
    expect(new Set(result)).toEqual(new Set<PermissionKey>(["employee_fields_sensitive_view", "members_invite"]));
  });
});

describe("blockingDependents", () => {
  it("returns an empty list for a leaf permission with no dependents", () => {
    const selected: PermissionKey[] = ["members_invite", "members_manage_roles"];
    // members_manage_roles has no dependents itself
    expect(blockingDependents("members_manage_roles", selected)).toEqual([]);
  });

  it("returns the one direct dependent of a prerequisite", () => {
    const selected: PermissionKey[] = ["members_invite", "members_manage_roles"];
    expect(blockingDependents("members_invite", selected)).toEqual(["members_manage_roles"]);
  });

  it("returns transitive dependents when unchecking a root prerequisite", () => {
    const selected: PermissionKey[] = ["projects_manage", "budgets_manage", "invoicing_manage"];
    const result = blockingDependents("projects_manage", selected);
    expect(new Set(result)).toEqual(new Set<PermissionKey>(["budgets_manage", "invoicing_manage"]));
  });

  it("only reports dependents that are actually selected", () => {
    // invoicing_manage is NOT selected, so it should not appear even though it
    // transitively depends on projects_manage via budgets_manage.
    const selected: PermissionKey[] = ["projects_manage", "budgets_manage"];
    expect(blockingDependents("projects_manage", selected)).toEqual(["budgets_manage"]);
  });

  it("T403: workflows_manage no longer depends on projects_manage, so unchecking projects_manage doesn't cascade to it", () => {
    const selected: PermissionKey[] = ["projects_manage", "workflows_manage", "automations_manage"];
    expect(blockingDependents("projects_manage", selected)).toEqual([]);
  });

  it("returns no dependents when the permission itself is not a prerequisite of anything selected", () => {
    const selected: PermissionKey[] = ["organization_settings_manage", "projects_manage"];
    expect(blockingDependents("organization_settings_manage", selected)).toEqual([]);
  });
});
