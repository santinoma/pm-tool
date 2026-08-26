import { describe, expect, it } from "vitest";
import { computeProfitability } from "../src/tenant/invoicing/profitability";

describe("computeProfitability", () => {
  it("computes revenue, cost, margin and margin percent", () => {
    const result = computeProfitability(
      [{ userId: "u1", durationMinutes: 60, amount: 120 }],
      { u1: 50 },
    );
    expect(result.revenue).toBe(120);
    expect(result.cost).toBe(50);
    expect(result.margin).toBe(70);
    expect(result.marginPercent).toBeCloseTo((70 / 120) * 100);
  });

  it("treats a missing or null cost rate as zero cost", () => {
    const result = computeProfitability([{ userId: "u1", durationMinutes: 60, amount: 100 }], {});
    expect(result.cost).toBe(0);
    expect(result.margin).toBe(100);

    const resultNull = computeProfitability(
      [{ userId: "u1", durationMinutes: 60, amount: 100 }],
      { u1: null },
    );
    expect(resultNull.cost).toBe(0);
  });

  it("returns 0% margin when there is no revenue", () => {
    const result = computeProfitability([], {});
    expect(result.marginPercent).toBe(0);
  });

  it("aggregates costs across multiple users", () => {
    const result = computeProfitability(
      [
        { userId: "u1", durationMinutes: 60, amount: 100 },
        { userId: "u2", durationMinutes: 30, amount: 40 },
      ],
      { u1: 40, u2: 20 },
    );
    expect(result.cost).toBe(50);
    expect(result.revenue).toBe(140);
  });
});
