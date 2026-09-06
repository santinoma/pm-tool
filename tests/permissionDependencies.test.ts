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

  it("walks a transitive chain: automations_manage -> workflows_manage -> projects_manage", () => {
    const result = resolveWithDependencies(["automations_manage"]);
    expect(new Set(result)).toEqual(
      new Set<PermissionKey>(["automations_manage", "workflows_manage", "projects_manage"]),
    );
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
    const selected: PermissionKey[] = ["projects_manage", "workflows_manage", "automations_manage"];
    const result = blockingDependents("projects_manage", selected);
    expect(new Set(result)).toEqual(new Set<PermissionKey>(["workflows_manage", "automations_manage"]));
  });

  it("only reports dependents that are actually selected", () => {
    // automations_manage is NOT selected, so it should not appear even though it
    // transitively depends on projects_manage via workflows_manage.
    const selected: PermissionKey[] = ["projects_manage", "workflows_manage"];
    expect(blockingDependents("projects_manage", selected)).toEqual(["workflows_manage"]);
  });

  it("returns no dependents when the permission itself is not a prerequisite of anything selected", () => {
    const selected: PermissionKey[] = ["organization_settings_manage", "projects_manage"];
    expect(blockingDependents("organization_settings_manage", selected)).toEqual([]);
  });
});
