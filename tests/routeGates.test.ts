import { describe, expect, it } from "vitest";
import { resolveMissingFeature } from "../src/tenant/entitlements/routeGates";
import { computeEntitledFeatures } from "../src/tenant/entitlements/features";

describe("resolveMissingFeature", () => {
  it("returns null for a core, ungated path regardless of plan", () => {
    const small = computeEntitledFeatures("small", []);
    expect(resolveMissingFeature("/dashboard", small)).toBeNull();
    expect(resolveMissingFeature("/api/tenant/tasks", small)).toBeNull();
  });

  it("blocks a gated page for the small plan", () => {
    const small = computeEntitledFeatures("small", []);
    expect(resolveMissingFeature("/portfolios", small)).toBe("portfolios_goals");
    expect(resolveMissingFeature("/financials", small)).toBe("budgets_financials");
  });

  it("blocks a gated API route with a dynamic segment", () => {
    const small = computeEntitledFeatures("small", []);
    expect(resolveMissingFeature("/api/tenant/projects/abc-123/cycles", small)).toBe("cycles_sprints");
    expect(resolveMissingFeature("/api/tenant/projects/abc-123/baselines", small)).toBe("baseline_diffing");
  });

  it("allows a gated route once the plan includes the feature", () => {
    const medium = computeEntitledFeatures("medium", []);
    expect(resolveMissingFeature("/financials", medium)).toBeNull();
    expect(resolveMissingFeature("/api/tenant/financials/nav-budgets", medium)).toBeNull();
    expect(resolveMissingFeature("/api/tenant/automation-rules", medium)).toBeNull();
    expect(resolveMissingFeature("/portfolios", medium)).toBe("portfolios_goals");
  });

  it("blocks the financials nav-budgets endpoint for the small plan", () => {
    const small = computeEntitledFeatures("small", []);
    expect(resolveMissingFeature("/api/tenant/financials/nav-budgets", small)).toBe("budgets_financials");
  });

  it("allows everything for the enterprise plan", () => {
    const enterprise = computeEntitledFeatures("enterprise", []);
    expect(resolveMissingFeature("/portfolios", enterprise)).toBeNull();
    expect(resolveMissingFeature("/projects/abc/baselines", enterprise)).toBeNull();
    expect(resolveMissingFeature("/api/tenant/organization/slack-capture", enterprise)).toBeNull();
  });

  it("leaves the public shared-view page ungated", () => {
    const small = computeEntitledFeatures("small", []);
    expect(resolveMissingFeature("/shared/some-token", small)).toBeNull();
  });

  it("grants a small-plan tenant the two_factor_scim add-on without granting other medium features", () => {
    const smallWithAddOn = computeEntitledFeatures("small", ["two_factor_scim"]);
    expect(resolveMissingFeature("/api/tenant/2fa/enroll", smallWithAddOn)).toBeNull();
    expect(resolveMissingFeature("/financials", smallWithAddOn)).toBe("budgets_financials");
  });

  it("does not let the integrations_marketplace gate swallow the slack_capture route", () => {
    const medium = computeEntitledFeatures("medium", []);
    // medium has integrations_marketplace but not slack_capture
    expect(resolveMissingFeature("/api/tenant/integrations/slack/capture", medium)).toBe("slack_capture");
    expect(resolveMissingFeature("/api/tenant/integrations", medium)).toBeNull();
  });
});
