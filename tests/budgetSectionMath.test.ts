import { describe, expect, it } from "vitest";
import { computeSectionTotals } from "../src/tenant/budgetingV2/sectionMath";

describe("computeSectionTotals", () => {
  it("computes total as quantity times price", () => {
    const result = computeSectionTotals({ quantity: 40, price: 120, budgetUsed: 0 });
    expect(result.budgetTotal).toBe(4800);
  });

  it("computes remaining as total minus used", () => {
    const result = computeSectionTotals({ quantity: 40, price: 120, budgetUsed: 1200 });
    expect(result.budgetRemaining).toBe(3600);
  });

  it("computes usage percent", () => {
    const result = computeSectionTotals({ quantity: 40, price: 120, budgetUsed: 2400 });
    expect(result.usagePercent).toBe(50);
  });

  it("avoids division by zero when total is zero", () => {
    const result = computeSectionTotals({ quantity: 0, price: 120, budgetUsed: 0 });
    expect(result.usagePercent).toBe(0);
  });
});
