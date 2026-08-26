import { describe, expect, it } from "vitest";
import { computeEntryCost } from "../src/tenant/timeTracking/entryCost";

describe("computeEntryCost", () => {
  it("computes cost for a full hour", () => {
    expect(computeEntryCost(60, 120)).toBe(120);
  });

  it("computes cost for a 15-minute entry", () => {
    expect(computeEntryCost(15, 120)).toBe(30);
  });

  it("returns 0 for zero duration", () => {
    expect(computeEntryCost(0, 120)).toBe(0);
  });
});
