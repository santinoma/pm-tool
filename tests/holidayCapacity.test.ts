import { describe, expect, it } from "vitest";
import { isHoliday, computeEffectiveWeeklyCapacity } from "../src/tenant/resourcePlanning/holidays";

const mkDate = (year: number, month: number, day: number, hours = 0) =>
  new Date(Date.UTC(year, month - 1, day, hours));

describe("isHoliday", () => {
  it("returns true when the date matches a holiday's UTC date key", () => {
    const holidays = [{ date: mkDate(2026, 12, 25) }];
    expect(isHoliday(mkDate(2026, 12, 25), holidays)).toBe(true);
  });

  it("matches even when time-of-day differs, comparing only the UTC date key", () => {
    const holidays = [{ date: mkDate(2026, 12, 25, 0) }];
    expect(isHoliday(mkDate(2026, 12, 25, 18), holidays)).toBe(true);
  });

  it("returns false when no holiday matches the date", () => {
    const holidays = [{ date: mkDate(2026, 12, 25) }];
    expect(isHoliday(mkDate(2026, 12, 26), holidays)).toBe(false);
  });

  it("returns false for an empty holidays list", () => {
    expect(isHoliday(mkDate(2026, 12, 25), [])).toBe(false);
  });
});

describe("computeEffectiveWeeklyCapacity", () => {
  const monToFri = [
    mkDate(2026, 8, 24),
    mkDate(2026, 8, 25),
    mkDate(2026, 8, 26),
    mkDate(2026, 8, 27),
    mkDate(2026, 8, 28),
  ];

  it("returns full capacity when no holidays fall in the week", () => {
    expect(computeEffectiveWeeklyCapacity(40, monToFri, [])).toBe(40);
  });

  it("returns full capacity for a user with no holiday calendar assigned (empty holidays)", () => {
    expect(computeEffectiveWeeklyCapacity(35, monToFri, [])).toBe(35);
  });

  it("reduces capacity proportionally for 1 holiday day in a 5-day week", () => {
    const holidays = [{ date: mkDate(2026, 8, 26) }];
    expect(computeEffectiveWeeklyCapacity(40, monToFri, holidays)).toBeCloseTo(32, 5); // 40 * 4/5
  });

  it("reduces capacity proportionally for 2 holiday days in a 5-day week", () => {
    const holidays = [{ date: mkDate(2026, 8, 26) }, { date: mkDate(2026, 8, 27) }];
    expect(computeEffectiveWeeklyCapacity(40, monToFri, holidays)).toBeCloseTo(24, 5); // 40 * 3/5
  });

  it("does not double-count a holiday that appears twice in the holidays list", () => {
    const holidays = [{ date: mkDate(2026, 8, 26) }, { date: mkDate(2026, 8, 26) }];
    expect(computeEffectiveWeeklyCapacity(40, monToFri, holidays)).toBeCloseTo(32, 5);
  });

  it("ignores holidays outside the given week days", () => {
    const holidays = [{ date: mkDate(2026, 9, 1) }];
    expect(computeEffectiveWeeklyCapacity(40, monToFri, holidays)).toBe(40);
  });

  it("clamps to zero when every day of the week is a holiday", () => {
    const holidays = monToFri.map((date) => ({ date }));
    expect(computeEffectiveWeeklyCapacity(40, monToFri, holidays)).toBe(0);
  });

  it("returns the base capacity unchanged when weekDays is empty", () => {
    expect(computeEffectiveWeeklyCapacity(40, [], [{ date: mkDate(2026, 8, 26) }])).toBe(40);
  });
});
