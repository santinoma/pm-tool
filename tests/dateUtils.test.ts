import { describe, expect, it } from "vitest";
import { buildMonthGrid, getUtcDateKey } from "../src/tenant/projects/dateUtils";

describe("getUtcDateKey", () => {
  it("formats a UTC date as YYYY-MM-DD regardless of the time component", () => {
    expect(getUtcDateKey(new Date("2026-03-05T23:59:00Z"))).toBe("2026-03-05");
    expect(getUtcDateKey(new Date("2026-03-05T00:00:00Z"))).toBe("2026-03-05");
  });

  it("pads single-digit months and days", () => {
    expect(getUtcDateKey(new Date("2026-01-02T12:00:00Z"))).toBe("2026-01-02");
  });
});

describe("buildMonthGrid", () => {
  it("returns 42 days (6 weeks) starting on a Monday", () => {
    const days = buildMonthGrid(2026, 2); // March 2026
    expect(days).toHaveLength(42);
    expect(days[0].getUTCDay()).toBe(1); // Monday
  });

  it("includes the first and last day of the target month", () => {
    const days = buildMonthGrid(2026, 2);
    const keys = days.map(getUtcDateKey);
    expect(keys).toContain("2026-03-01");
    expect(keys).toContain("2026-03-31");
  });
});
