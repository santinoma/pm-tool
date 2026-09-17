import { describe, expect, it } from "vitest";
import {
  countWorkingDaysInMonth,
  countWorkingDaysInYear,
  resolveCurrentCostRateEntry,
  resolveCurrentHourlyCost,
  resolveHourlyCostForEntry,
} from "../src/tenant/costRates/costRateHistory";

const MON_FRI = [1, 2, 3, 4, 5];

describe("countWorkingDaysInMonth", () => {
  it("counts Mon-Fri working days in September 2026 (30 days, starts Tuesday)", () => {
    // 2026-09-01 is a Tuesday -> 22 weekdays in September 2026.
    expect(countWorkingDaysInMonth(2026, 8, MON_FRI)).toBe(22);
  });

  it("counts all 7 days when every weekday is a working day", () => {
    expect(countWorkingDaysInMonth(2026, 8, [0, 1, 2, 3, 4, 5, 6])).toBe(30);
  });
});

describe("countWorkingDaysInYear", () => {
  it("sums working days across all 12 months", () => {
    const total = countWorkingDaysInYear(2026, MON_FRI);
    const manualSum = Array.from({ length: 12 }, (_, month) => countWorkingDaysInMonth(2026, month, MON_FRI)).reduce(
      (a, b) => a + b,
      0,
    );
    expect(total).toBe(manualSum);
    expect(total).toBeGreaterThan(250);
    expect(total).toBeLessThan(262);
  });
});

describe("resolveHourlyCostForEntry (T316)", () => {
  it("hourly rate resolves to itself", () => {
    expect(resolveHourlyCostForEntry({ rateType: "hourly", amount: 45, workHoursPerDay: 8 }, new Date("2026-09-16"))).toBe(45);
  });

  it("weekly rate divides by workHoursPerDay times the working week length", () => {
    const cost = resolveHourlyCostForEntry({ rateType: "weekly", amount: 1600, workHoursPerDay: 8 }, new Date("2026-09-16"), MON_FRI);
    expect(cost).toBeCloseTo(1600 / (8 * 5), 5);
  });

  it("biweekly rate divides by workHoursPerDay times twice the working week length", () => {
    const cost = resolveHourlyCostForEntry({ rateType: "biweekly", amount: 3200, workHoursPerDay: 8 }, new Date("2026-09-16"), MON_FRI);
    expect(cost).toBeCloseTo(3200 / (8 * 10), 5);
  });

  it("monthly rate divides by workHoursPerDay times working days in that calendar month", () => {
    const cost = resolveHourlyCostForEntry({ rateType: "monthly", amount: 6000, workHoursPerDay: 8 }, new Date("2026-09-16"), MON_FRI);
    expect(cost).toBeCloseTo(6000 / (8 * 22), 5);
  });

  it("annual rate divides by workHoursPerDay times working days in that calendar year", () => {
    const workingDaysInYear = countWorkingDaysInYear(2026, MON_FRI);
    const cost = resolveHourlyCostForEntry({ rateType: "annual", amount: 72000, workHoursPerDay: 8 }, new Date("2026-09-16"), MON_FRI);
    expect(cost).toBeCloseTo(72000 / (8 * workingDaysInYear), 5);
  });
});

describe("resolveCurrentCostRateEntry / resolveCurrentHourlyCost (T316)", () => {
  const entries = [
    { rateType: "monthly" as const, amount: 5000, workHoursPerDay: 8, startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31") },
    { rateType: "monthly" as const, amount: 6000, workHoursPerDay: 8, startDate: new Date("2026-01-01"), endDate: null },
  ];

  it("picks the entry covering the given date", () => {
    const current = resolveCurrentCostRateEntry(entries, new Date("2026-06-15"));
    expect(current?.amount).toBe(6000);
  });

  it("picks the historical entry for a date in the past", () => {
    const past = resolveCurrentCostRateEntry(entries, new Date("2025-06-15"));
    expect(past?.amount).toBe(5000);
  });

  it("returns null when no entry covers the given date", () => {
    const none = resolveCurrentCostRateEntry(entries, new Date("2024-06-15"));
    expect(none).toBeNull();
  });

  it("resolveCurrentHourlyCost combines entry selection with rate resolution", () => {
    const cost = resolveCurrentHourlyCost(entries, new Date("2026-09-16"), MON_FRI);
    expect(cost).toBeCloseTo(6000 / (8 * 22), 5);
  });

  it("resolveCurrentHourlyCost returns null when nothing is currently active", () => {
    expect(resolveCurrentHourlyCost(entries, new Date("2024-01-01"), MON_FRI)).toBeNull();
  });
});
