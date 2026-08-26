import { describe, expect, it } from "vitest";
import { getCurrentWeekRange, isWithinWeek } from "../src/tenant/resourcePlanning/week";

describe("getCurrentWeekRange", () => {
  it("returns Monday 00:00 UTC through Sunday 23:59:59.999 UTC for a mid-week date", () => {
    const wednesday = new Date("2026-08-26T12:00:00.000Z");
    const { start, end } = getCurrentWeekRange(wednesday);
    expect(start.toISOString()).toBe("2026-08-24T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-30T23:59:59.999Z");
  });

  it("treats Monday 00:00 UTC itself as the start of its own week", () => {
    const monday = new Date("2026-08-24T00:00:00.000Z");
    const { start } = getCurrentWeekRange(monday);
    expect(start.toISOString()).toBe("2026-08-24T00:00:00.000Z");
  });

  it("treats Sunday 23:59 UTC as the end of the same week, not the next", () => {
    const sundayLate = new Date("2026-08-30T23:59:00.000Z");
    const { start, end } = getCurrentWeekRange(sundayLate);
    expect(start.toISOString()).toBe("2026-08-24T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-30T23:59:59.999Z");
  });

  it("rolls over correctly into the next week just after midnight Monday", () => {
    const nextMonday = new Date("2026-08-31T00:00:00.000Z");
    const { start } = getCurrentWeekRange(nextMonday);
    expect(start.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });
});

describe("isWithinWeek", () => {
  it("returns true for a date inside the range and false for one outside", () => {
    const week = getCurrentWeekRange(new Date("2026-08-26T12:00:00.000Z"));
    expect(isWithinWeek(new Date("2026-08-27T00:00:00.000Z"), week)).toBe(true);
    expect(isWithinWeek(new Date("2026-08-23T23:59:59.000Z"), week)).toBe(false);
    expect(isWithinWeek(new Date("2026-08-31T00:00:00.000Z"), week)).toBe(false);
  });
});
