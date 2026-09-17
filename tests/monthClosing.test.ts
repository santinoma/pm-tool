import { describe, expect, it } from "vitest";
import { computeAutoLockThreshold, getPeriodKey, isPeriodAutoLocked } from "../src/tenant/financials/monthClosing";

describe("getPeriodKey", () => {
  it("formats the UTC year-month as YYYY-MM", () => {
    expect(getPeriodKey(new Date("2026-08-31T23:59:59.000Z"))).toBe("2026-08");
    expect(getPeriodKey(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01");
  });
});

describe("computeAutoLockThreshold", () => {
  it("resolves to the closingDay of the month right after the period", () => {
    expect(computeAutoLockThreshold("2026-08", 5).toISOString()).toBe("2026-09-05T00:00:00.000Z");
  });

  it("rolls over the year for December", () => {
    expect(computeAutoLockThreshold("2026-12", 1).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("isPeriodAutoLocked (T312 Financial Month Closing)", () => {
  it("never locks when the feature is disabled", () => {
    expect(isPeriodAutoLocked("2026-08", new Date("2026-12-01T00:00:00.000Z"), false, 5)).toBe(false);
  });

  it("does not lock the previous month before the closing day", () => {
    expect(isPeriodAutoLocked("2026-08", new Date("2026-09-04T23:59:59.000Z"), true, 5)).toBe(false);
  });

  it("locks the previous month on/after the closing day", () => {
    expect(isPeriodAutoLocked("2026-08", new Date("2026-09-05T00:00:00.000Z"), true, 5)).toBe(true);
  });

  it("locks a month further in the past once its own threshold has passed", () => {
    expect(isPeriodAutoLocked("2026-06", new Date("2026-12-01T00:00:00.000Z"), true, 5)).toBe(true);
  });

  it("does not lock the current month", () => {
    expect(isPeriodAutoLocked("2026-09", new Date("2026-09-20T00:00:00.000Z"), true, 5)).toBe(false);
  });
});
