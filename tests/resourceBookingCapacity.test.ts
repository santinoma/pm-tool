import { describe, expect, it } from "vitest";
import { computeDailyCapacity, validateBookingInput } from "../src/tenant/resourcePlanning/capacity";

function day(iso: string): Date {
  return new Date(iso);
}

describe("validateBookingInput", () => {
  it("rejects when neither userId nor placeholderName is set", () => {
    const result = validateBookingInput({ startDate: "2026-08-24", endDate: "2026-08-28" });
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects when both userId and placeholderName are set", () => {
    const result = validateBookingInput({
      userId: "u1",
      placeholderName: "Frontend Dev (offen)",
      startDate: "2026-08-24",
      endDate: "2026-08-28",
    });
    expect(result.valid).toBe(false);
  });

  it("accepts when only userId is set", () => {
    const result = validateBookingInput({
      userId: "u1",
      startDate: "2026-08-24",
      endDate: "2026-08-28",
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts when only placeholderName is set", () => {
    const result = validateBookingInput({
      placeholderName: "Frontend Dev (offen)",
      startDate: "2026-08-24",
      endDate: "2026-08-28",
    });
    expect(result.valid).toBe(true);
  });

  it("treats an empty-string placeholderName as unset (still requires userId)", () => {
    const result = validateBookingInput({
      placeholderName: "",
      startDate: "2026-08-24",
      endDate: "2026-08-28",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects an invalid date range where endDate is before startDate", () => {
    const result = validateBookingInput({
      userId: "u1",
      startDate: "2026-08-28",
      endDate: "2026-08-24",
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/endDate/);
  });

  it("accepts a single-day range where endDate equals startDate", () => {
    const result = validateBookingInput({
      userId: "u1",
      startDate: "2026-08-24",
      endDate: "2026-08-24",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects unparseable dates", () => {
    const result = validateBookingInput({
      userId: "u1",
      startDate: "not-a-date",
      endDate: "2026-08-24",
    });
    expect(result.valid).toBe(false);
  });
});

describe("computeDailyCapacity", () => {
  const monday = day("2026-08-24T00:00:00.000Z");
  const tuesday = day("2026-08-25T00:00:00.000Z");
  const wednesday = day("2026-08-26T00:00:00.000Z");
  const days = [monday, tuesday, wednesday];

  it("sums hoursPerDay across multiple overlapping bookings for the same user/day", () => {
    const bookings = [
      {
        userId: "u1",
        startDate: day("2026-08-24T00:00:00.000Z"),
        endDate: day("2026-08-26T23:59:59.999Z"),
        hoursPerDay: 4,
        isTentative: false,
      },
      {
        userId: "u1",
        startDate: day("2026-08-25T00:00:00.000Z"),
        endDate: day("2026-08-25T23:59:59.999Z"),
        hoursPerDay: 3,
        isTentative: false,
      },
    ];
    const result = computeDailyCapacity(bookings, "u1", 40, days);
    expect(result[0].bookedHours).toBe(4); // Monday: only first booking
    expect(result[1].bookedHours).toBe(7); // Tuesday: both bookings overlap
    expect(result[2].bookedHours).toBe(4); // Wednesday: only first booking
  });

  it("uses a 5-day-week daily capacity baseline (weeklyCapacityHours / 5)", () => {
    const result = computeDailyCapacity([], "u1", 40, days);
    for (const entry of result) {
      expect(entry.capacityHours).toBe(8);
    }
  });

  it("flags a day as over-capacity when confirmed bookings exceed the daily baseline", () => {
    const bookings = [
      {
        userId: "u1",
        startDate: monday,
        endDate: monday,
        hoursPerDay: 9,
        isTentative: false,
      },
    ];
    const result = computeDailyCapacity(bookings, "u1", 40, [monday]);
    expect(result[0].isOver).toBe(true);
    expect(result[0].confirmedHours).toBe(9);
  });

  it("does not flag over-capacity when bookings are within the daily baseline", () => {
    const bookings = [
      {
        userId: "u1",
        startDate: monday,
        endDate: monday,
        hoursPerDay: 8,
        isTentative: false,
      },
    ];
    const result = computeDailyCapacity(bookings, "u1", 40, [monday]);
    expect(result[0].isOver).toBe(false);
  });

  it("excludes tentative bookings from the over-capacity signal even though they count toward bookedHours", () => {
    const bookings = [
      {
        userId: "u1",
        startDate: monday,
        endDate: monday,
        hoursPerDay: 6,
        isTentative: false,
      },
      {
        userId: "u1",
        startDate: monday,
        endDate: monday,
        hoursPerDay: 6,
        isTentative: true,
      },
    ];
    const result = computeDailyCapacity(bookings, "u1", 40, [monday]);
    expect(result[0].confirmedHours).toBe(6);
    expect(result[0].tentativeHours).toBe(6);
    expect(result[0].bookedHours).toBe(12);
    expect(result[0].isOver).toBe(false); // confirmed alone (6) is within 8h baseline
  });

  it("flags over-capacity from tentative-only bookings as false, purely confirmed-based", () => {
    const bookings = [
      {
        userId: "u1",
        startDate: monday,
        endDate: monday,
        hoursPerDay: 10,
        isTentative: true,
      },
    ];
    const result = computeDailyCapacity(bookings, "u1", 40, [monday]);
    expect(result[0].isOver).toBe(false);
    expect(result[0].bookedHours).toBe(10);
  });

  it("ignores bookings belonging to other users", () => {
    const bookings = [
      {
        userId: "other",
        startDate: monday,
        endDate: wednesday,
        hoursPerDay: 8,
        isTentative: false,
      },
    ];
    const result = computeDailyCapacity(bookings, "u1", 40, days);
    for (const entry of result) {
      expect(entry.bookedHours).toBe(0);
    }
  });

  it("excludes bookings that do not overlap the given day", () => {
    const bookings = [
      {
        userId: "u1",
        startDate: day("2026-09-01T00:00:00.000Z"),
        endDate: day("2026-09-05T00:00:00.000Z"),
        hoursPerDay: 8,
        isTentative: false,
      },
    ];
    const result = computeDailyCapacity(bookings, "u1", 40, days);
    for (const entry of result) {
      expect(entry.bookedHours).toBe(0);
    }
  });
});
