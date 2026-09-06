import { describe, expect, it } from "vitest";
import { sanitizeEnabledModules, computeEffectiveModules } from "../src/tenant/projects/moduleCatalog";

const NO_DATA = { hasWiki: false, hasBudgets: false, hasCycles: false, hasBaselines: false, hasCheckIns: false };

describe("sanitizeEnabledModules", () => {
  it("always includes tasks even if not selected", () => {
    expect(sanitizeEnabledModules([])).toEqual(["tasks"]);
  });

  it("keeps only known real module keys", () => {
    const result = sanitizeEnabledModules(["wiki", "budgets", "deals", "not_a_real_key"]);
    expect(result.sort()).toEqual(["budgets", "tasks", "wiki"].sort());
  });

  it("does not duplicate tasks", () => {
    expect(sanitizeEnabledModules(["tasks", "wiki"]).filter((k) => k === "tasks")).toHaveLength(1);
  });
});

describe("computeEffectiveModules", () => {
  it("shows exactly what was selected when the project has no other data", () => {
    const effective = computeEffectiveModules(["tasks", "wiki"], NO_DATA);
    expect(effective).toEqual(new Set(["tasks", "wiki"]));
  });

  it("keeps a module visible when the project already has real data for it, even if not selected", () => {
    // Simulates a pre-wizard project that only has enabledModules=["tasks"] in storage.
    const effective = computeEffectiveModules(["tasks"], { ...NO_DATA, hasBudgets: true, hasCycles: true });
    expect(effective.has("budgets")).toBe(true);
    expect(effective.has("cycles")).toBe(true);
    expect(effective.has("baselines")).toBe(false);
  });

  it("always includes tasks regardless of storage", () => {
    expect(computeEffectiveModules([], NO_DATA).has("tasks")).toBe(true);
  });
});
