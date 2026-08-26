import { describe, expect, it } from "vitest";
import { hasProjectAccess } from "../src/tenant/portal/portalAccess";

describe("hasProjectAccess", () => {
  it("returns true when the project id is in the granted list", () => {
    expect(hasProjectAccess(["p1", "p2"], "p1")).toBe(true);
  });

  it("returns false when the project id is not in the granted list", () => {
    expect(hasProjectAccess(["p1", "p2"], "p3")).toBe(false);
  });

  it("returns false for an empty granted list", () => {
    expect(hasProjectAccess([], "p1")).toBe(false);
  });
});
