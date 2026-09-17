import { describe, expect, it } from "vitest";
import { computeEffectiveUnitPrice, computeServiceTotal, isOverrunBlocked, resolveBaseRate } from "../src/tenant/budgeting/servicePricing";

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

describe("resolveBaseRate (T313 Billable Rate Strategy)", () => {
  it("service strategy uses the section price, ignoring person/budget rates", () => {
    expect(resolveBaseRate("service", 100, 50, 200)).toBe(100);
  });

  it("person strategy uses the assignee's individual rate", () => {
    expect(resolveBaseRate("person", 100, 50, 200)).toBe(50);
  });

  it("person strategy falls back to the section price when the person has no rate configured", () => {
    expect(resolveBaseRate("person", 100, null, 200)).toBe(100);
  });

  it("single strategy uses the one flat budget-wide rate, ignoring section/person rates", () => {
    expect(resolveBaseRate("single", 100, 50, 200)).toBe(200);
  });

  it("single strategy without a configured budget rate resolves to 0", () => {
    expect(resolveBaseRate("single", 100, 50, null)).toBe(0);
  });

  it("no_rate strategy always resolves to 0", () => {
    expect(resolveBaseRate("no_rate", 100, 50, 200)).toBe(0);
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
