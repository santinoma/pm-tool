import { describe, expect, it } from "vitest";
import { computeEntitledFeatures, hasFeature, PLAN_FEATURES } from "../src/tenant/entitlements/features";

describe("computeEntitledFeatures", () => {
  it("grants no gated features on the small plan by default", () => {
    const entitled = computeEntitledFeatures("small", []);
    expect(entitled.size).toBe(0);
  });

  it("grants an add-on feature on top of the small plan", () => {
    const entitled = computeEntitledFeatures("small", ["two_factor_scim"]);
    expect(hasFeature(entitled, "two_factor_scim")).toBe(true);
    expect(hasFeature(entitled, "budgets_financials")).toBe(false);
  });

  it("ignores unknown add-on strings", () => {
    const entitled = computeEntitledFeatures("small", ["not_a_real_feature"]);
    expect(entitled.size).toBe(0);
  });

  it("grants the medium plan's feature set including two_factor_scim", () => {
    const entitled = computeEntitledFeatures("medium", []);
    expect(hasFeature(entitled, "budgets_financials")).toBe(true);
    expect(hasFeature(entitled, "two_factor_scim")).toBe(true);
    expect(hasFeature(entitled, "portfolios_goals")).toBe(false);
  });

  it("grants the enterprise plan a strict superset of medium's features", () => {
    const medium = computeEntitledFeatures("medium", []);
    const enterprise = computeEntitledFeatures("enterprise", []);
    for (const feature of medium) {
      expect(enterprise.has(feature)).toBe(true);
    }
    expect(hasFeature(enterprise, "portfolios_goals")).toBe(true);
    expect(hasFeature(enterprise, "baseline_diffing")).toBe(true);
    expect(hasFeature(enterprise, "slack_capture")).toBe(true);
    expect(hasFeature(enterprise, "dedicated_infra")).toBe(true);
  });

  it("PLAN_FEATURES.enterprise contains every one of PLAN_FEATURES.medium", () => {
    for (const feature of PLAN_FEATURES.medium) {
      expect(PLAN_FEATURES.enterprise).toContain(feature);
    }
  });
});
