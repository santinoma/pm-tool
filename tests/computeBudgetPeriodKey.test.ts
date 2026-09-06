import { describe, expect, it } from "vitest";
import { computeBudgetPeriodKey } from "../src/tenant/budgeting/recurrencePeriod";

describe("computeBudgetPeriodKey", () => {
  it("returns the same key for different weekdays of the same week with 'weekly'", () => {
    const monday = computeBudgetPeriodKey(new Date("2026-08-24T00:00:00.000Z"), "weekly");
    const wednesday = computeBudgetPeriodKey(new Date("2026-08-26T12:00:00.000Z"), "weekly");
    const sunday = computeBudgetPeriodKey(new Date("2026-08-30T23:00:00.000Z"), "weekly");
    expect(wednesday).toBe(monday);
    expect(sunday).toBe(monday);
  });

  it("returns a different key for the following week with 'weekly'", () => {
    const thisWeek = computeBudgetPeriodKey(new Date("2026-08-26T12:00:00.000Z"), "weekly");
    const nextWeek = computeBudgetPeriodKey(new Date("2026-08-31T00:00:00.000Z"), "weekly");
    expect(thisWeek).not.toBe(nextWeek);
  });

  it("returns the same key for different days of the same month with 'monthly'", () => {
    const early = computeBudgetPeriodKey(new Date("2026-08-01T00:00:00.000Z"), "monthly");
    const late = computeBudgetPeriodKey(new Date("2026-08-31T23:59:59.000Z"), "monthly");
    expect(early).toBe(late);
    expect(early).toBe("2026-08");
  });

  it("returns a different key for the following month with 'monthly'", () => {
    const august = computeBudgetPeriodKey(new Date("2026-08-15T00:00:00.000Z"), "monthly");
    const september = computeBudgetPeriodKey(new Date("2026-09-01T00:00:00.000Z"), "monthly");
    expect(august).not.toBe(september);
  });

  it("pads single-digit months for 'monthly'", () => {
    const key = computeBudgetPeriodKey(new Date("2026-01-05T00:00:00.000Z"), "monthly");
    expect(key).toBe("2026-01");
  });
});
