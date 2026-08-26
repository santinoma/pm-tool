import { describe, expect, it } from "vitest";
import { computeCurrentPeriod } from "../src/tenant/retainer/period";

describe("computeCurrentPeriod", () => {
  it("returns Monday–Sunday UTC for a weekly interval", () => {
    const period = computeCurrentPeriod("weekly", new Date("2026-08-26T12:00:00.000Z")); // Wednesday
    expect(period.start.toISOString()).toBe("2026-08-24T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-08-30T23:59:59.999Z");
  });

  it("returns the full calendar month UTC for a monthly interval", () => {
    const period = computeCurrentPeriod("monthly", new Date("2026-08-26T12:00:00.000Z"));
    expect(period.start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-08-31T23:59:59.999Z");
  });

  it("handles a short month correctly (February)", () => {
    const period = computeCurrentPeriod("monthly", new Date("2026-02-10T00:00:00.000Z"));
    expect(period.start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-02-28T23:59:59.999Z");
  });
});
