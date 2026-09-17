import { describe, expect, it } from "vitest";
import {
  SYSTEM_PERMISSION_SETS,
  ADMIN_SET_NAME,
  MANAGER_SET_NAME,
  PROFITABILITY_MANAGER_SET_NAME,
  COORDINATOR_SET_NAME,
  STAFF_SET_NAME,
  CONTRACTOR_SET_NAME,
  CLIENT_COLLABORATOR_SET_NAME,
  CLIENT_LEAD_SET_NAME,
  getDefaultSystemSetNameForRole,
} from "@/tenant/permissions/systemPermissionSets";
import { PERMISSION_KEYS, type PermissionKey } from "@/tenant/permissions/permissionCatalog";

describe("SYSTEM_PERMISSION_SETS (T402)", () => {
  it("defines exactly the eight Productive default permission sets", () => {
    const names = SYSTEM_PERMISSION_SETS.map((set) => set.name);
    expect(new Set(names)).toEqual(
      new Set([
        ADMIN_SET_NAME,
        MANAGER_SET_NAME,
        PROFITABILITY_MANAGER_SET_NAME,
        COORDINATOR_SET_NAME,
        STAFF_SET_NAME,
        CONTRACTOR_SET_NAME,
        CLIENT_COLLABORATOR_SET_NAME,
        CLIENT_LEAD_SET_NAME,
      ]),
    );
    expect(names).toHaveLength(8);
  });

  it("Admin has every permission key", () => {
    const admin = SYSTEM_PERMISSION_SETS.find((set) => set.name === ADMIN_SET_NAME)!;
    expect(new Set(admin.permissions)).toEqual(new Set(PERMISSION_KEYS));
  });

  it("Manager lacks cost rates, org settings, and financial month closing", () => {
    const manager = SYSTEM_PERMISSION_SETS.find((set) => set.name === MANAGER_SET_NAME)!;
    expect(manager.permissions).not.toContain("cost_rates_manage");
    expect(manager.permissions).not.toContain("organization_settings_manage");
    expect(manager.permissions).not.toContain("financial_month_closing_manage");
  });

  it("Profitability Manager has everything Manager has, plus cost_rates_manage", () => {
    const manager = SYSTEM_PERMISSION_SETS.find((set) => set.name === MANAGER_SET_NAME)!;
    const profitabilityManager = SYSTEM_PERMISSION_SETS.find((set) => set.name === PROFITABILITY_MANAGER_SET_NAME)!;
    for (const key of manager.permissions) {
      expect(profitabilityManager.permissions).toContain(key);
    }
    expect(profitabilityManager.permissions).toContain("cost_rates_manage");
    expect(profitabilityManager.permissions).not.toContain("organization_settings_manage");
    expect(profitabilityManager.permissions).not.toContain("financial_month_closing_manage");
  });

  it("Coordinator has full task/workflow/automation/resourcing access but cannot manage projects themselves (T403)", () => {
    const coordinator = SYSTEM_PERMISSION_SETS.find((set) => set.name === COORDINATOR_SET_NAME)!;
    expect(new Set(coordinator.permissions)).toEqual(
      new Set<PermissionKey>(["tasks_manage_all", "workflows_manage", "automations_manage", "resourcing_view_all"]),
    );
    expect(coordinator.permissions).not.toContain("projects_manage");
    expect(coordinator.permissions).not.toContain("budgets_manage");
  });

  it("Manager and Profitability Manager have members_manage_roles and resourcing_view_all (T403)", () => {
    const manager = SYSTEM_PERMISSION_SETS.find((set) => set.name === MANAGER_SET_NAME)!;
    const profitabilityManager = SYSTEM_PERMISSION_SETS.find((set) => set.name === PROFITABILITY_MANAGER_SET_NAME)!;
    for (const set of [manager, profitabilityManager]) {
      expect(set.permissions).toContain("members_manage_roles");
      expect(set.permissions).toContain("resourcing_view_all");
    }
  });

  it("Staff, Contractor, Client Collaborator, and Client Lead have no elevated org-level keys", () => {
    for (const name of [STAFF_SET_NAME, CONTRACTOR_SET_NAME, CLIENT_COLLABORATOR_SET_NAME, CLIENT_LEAD_SET_NAME]) {
      const set = SYSTEM_PERMISSION_SETS.find((s) => s.name === name)!;
      expect(set.permissions).toEqual([]);
    }
  });

  it("every permission key used is a real, known key", () => {
    const known = new Set<string>(PERMISSION_KEYS);
    for (const set of SYSTEM_PERMISSION_SETS) {
      for (const key of set.permissions) {
        expect(known.has(key)).toBe(true);
      }
    }
  });
});

describe("getDefaultSystemSetNameForRole (T402)", () => {
  it("maps owner and admin to the Admin set", () => {
    expect(getDefaultSystemSetNameForRole("owner")).toBe(ADMIN_SET_NAME);
    expect(getDefaultSystemSetNameForRole("admin")).toBe(ADMIN_SET_NAME);
  });

  it("maps member to Staff", () => {
    expect(getDefaultSystemSetNameForRole("member")).toBe(STAFF_SET_NAME);
  });

  it("maps client to Client Collaborator", () => {
    expect(getDefaultSystemSetNameForRole("client")).toBe(CLIENT_COLLABORATOR_SET_NAME);
  });
});
