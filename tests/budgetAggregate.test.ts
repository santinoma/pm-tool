import { describe, expect, it } from "vitest";
import { computeBudgetStatus } from "../src/tenant/budgeting/aggregate";

describe("computeBudgetStatus", () => {
  it("returns zero hours and null amount for no time and no rate", () => {
    expect(computeBudgetStatus(0, null)).toEqual({ actualHours: 0, actualAmount: null });
  });

  it("converts minutes to hours", () => {
    expect(computeBudgetStatus(90, null)).toEqual({ actualHours: 1.5, actualAmount: null });
  });

  it("computes actual amount when an hourly rate is set", () => {
    expect(computeBudgetStatus(120, 50)).toEqual({ actualHours: 2, actualAmount: 100 });
  });

  it("returns null amount when rate is null even with logged time", () => {
    expect(computeBudgetStatus(60, null)).toEqual({ actualHours: 1, actualAmount: null });
  });
});
