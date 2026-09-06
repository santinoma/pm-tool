import { describe, expect, it } from "vitest";
import { computeEffectiveUnitPrice, computeServiceTotal, isOverrunBlocked } from "../src/tenant/budgeting/servicePricing";

describe("computeEffectiveUnitPrice", () => {
  it("returns the base price with no discount/markup", () => {
    expect(computeEffectiveUnitPrice(100, null, null)).toBe(100);
  });

  it("applies a discount", () => {
    expect(computeEffectiveUnitPrice(100, 10, null)).toBe(90);
  });

  it("applies a markup", () => {
    expect(computeEffectiveUnitPrice(100, null, 20)).toBe(120);
  });

  it("applies discount before markup, on the reduced amount", () => {
    expect(computeEffectiveUnitPrice(100, 10, 10)).toBeCloseTo(99, 5);
  });
});

describe("computeServiceTotal", () => {
  it("multiplies quantity by the effective unit price", () => {
    expect(computeServiceTotal(5, 100, 10, null)).toBe(450);
  });
});

describe("isOverrunBlocked", () => {
  it("never blocks when blockOverrun is false", () => {
    expect(isOverrunBlocked(90, 20, 100, false)).toBe(false);
  });

  it("never blocks when there is no cap", () => {
    expect(isOverrunBlocked(90, 20, null, true)).toBe(false);
  });

  it("blocks when the addition would exceed the cap", () => {
    expect(isOverrunBlocked(90, 20, 100, true)).toBe(true);
  });

  it("allows an addition that stays within the cap", () => {
    expect(isOverrunBlocked(50, 20, 100, true)).toBe(false);
  });
});
