import { describe, expect, it } from "vitest";
import { addDays, computeBarPosition, differenceInDays } from "../src/tenant/projects/dateUtils";

describe("differenceInDays", () => {
  it("computes whole-day differences ignoring time-of-day", () => {
    expect(differenceInDays(new Date("2026-01-10T23:00:00Z"), new Date("2026-01-01T01:00:00Z"))).toBe(9);
  });

  it("returns 0 for the same day at different times", () => {
    expect(differenceInDays(new Date("2026-01-01T23:00:00Z"), new Date("2026-01-01T01:00:00Z"))).toBe(0);
  });

  it("handles negative differences", () => {
    expect(differenceInDays(new Date("2026-01-01T00:00:00Z"), new Date("2026-01-10T00:00:00Z"))).toBe(-9);
  });
});

describe("addDays", () => {
  it("adds whole days, crossing month boundaries correctly", () => {
    const result = addDays(new Date("2026-01-30T00:00:00Z"), 3);
    expect(result.toISOString().slice(0, 10)).toBe("2026-02-02");
  });
});

describe("computeBarPosition", () => {
  const rangeStart = new Date("2026-01-01T00:00:00Z");

  it("positions a bar starting at the range start with 0 left offset", () => {
    const pos = computeBarPosition(rangeStart, new Date("2026-01-03T00:00:00Z"), rangeStart, 20);
    expect(pos.left).toBe(0);
    expect(pos.width).toBe(3 * 20); // Jan 1, 2, 3 inclusive = 3 days
  });

  it("offsets a bar starting later in the range", () => {
    const pos = computeBarPosition(
      new Date("2026-01-05T00:00:00Z"),
      new Date("2026-01-05T00:00:00Z"),
      rangeStart,
      20,
    );
    expect(pos.left).toBe(4 * 20);
    expect(pos.width).toBe(20); // single-day bar, minimum 1 day wide
  });
});
