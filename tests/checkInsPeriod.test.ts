import { describe, expect, it } from "vitest";
import { computePeriodKey } from "../src/tenant/checkIns/period";

describe("computePeriodKey", () => {
  it("returns the same key for the same day with 'daily'", () => {
    const a = computePeriodKey(new Date("2026-08-25T08:00:00.000Z"), "daily");
    const b = computePeriodKey(new Date("2026-08-25T20:00:00.000Z"), "daily");
    expect(a).toBe(b);
  });

  it("returns different keys for different days with 'daily'", () => {
    const a = computePeriodKey(new Date("2026-08-25T08:00:00.000Z"), "daily");
    const b = computePeriodKey(new Date("2026-08-26T08:00:00.000Z"), "daily");
    expect(a).not.toBe(b);
  });

  it("returns the same key for different weekdays of the same week with 'weekly'", () => {
    const monday = computePeriodKey(new Date("2026-08-24T00:00:00.000Z"), "weekly");
    const wednesday = computePeriodKey(new Date("2026-08-26T12:00:00.000Z"), "weekly");
    const sunday = computePeriodKey(new Date("2026-08-30T23:00:00.000Z"), "weekly");
    expect(wednesday).toBe(monday);
    expect(sunday).toBe(monday);
  });

  it("returns a different key for the following week with 'weekly'", () => {
    const thisWeek = computePeriodKey(new Date("2026-08-26T12:00:00.000Z"), "weekly");
    const nextWeek = computePeriodKey(new Date("2026-08-31T00:00:00.000Z"), "weekly");
    expect(thisWeek).not.toBe(nextWeek);
  });
});
