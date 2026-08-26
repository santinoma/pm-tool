import { describe, expect, it } from "vitest";
import { resolveInitialTriageState } from "../src/tenant/projects/triageState";

describe("resolveInitialTriageState", () => {
  it("returns true when triage is enabled", () => {
    expect(resolveInitialTriageState(true)).toBe(true);
  });

  it("returns false when triage is disabled", () => {
    expect(resolveInitialTriageState(false)).toBe(false);
  });
});
