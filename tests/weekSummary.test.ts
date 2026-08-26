import { describe, expect, it } from "vitest";
import { buildWeekSummary } from "../src/tenant/companyTime/weekSummary";

const WEEK = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30"];

describe("buildWeekSummary", () => {
  it("sums booked minutes into hours per day and week total", () => {
    const summary = buildWeekSummary(
      [{ id: "u1", name: "Anna", email: "anna@example.com", weeklyCapacityHours: 40 }],
      [
        { userId: "u1", date: "2026-08-24", durationMinutes: 60, serviceLabel: null, timeRange: null, description: null },
        { userId: "u1", date: "2026-08-24", durationMinutes: 30, serviceLabel: null, timeRange: null, description: null },
      ],
      [],
      WEEK,
    );
    expect(summary[0].days[0].hours).toBe(1.5);
    expect(summary[0].totalHours).toBe(1.5);
  });

  it("credits weeklyCapacityHours/5 on an approved absence day even with no bookings", () => {
    const summary = buildWeekSummary(
      [{ id: "u1", name: "Anna", email: "anna@example.com", weeklyCapacityHours: 40 }],
      [],
      [{ userId: "u1", startDate: "2026-08-24", endDate: "2026-08-28" }],
      WEEK,
    );
    expect(summary[0].days[0].isAbsence).toBe(true);
    expect(summary[0].days[0].hours).toBe(8);
    expect(summary[0].days[5].isAbsence).toBe(false);
    expect(summary[0].totalHours).toBe(40);
  });

  it("adds absence credit on top of any booked hours on the same day", () => {
    const summary = buildWeekSummary(
      [{ id: "u1", name: "Anna", email: "anna@example.com", weeklyCapacityHours: 40 }],
      [{ userId: "u1", date: "2026-08-24", durationMinutes: 60, serviceLabel: null, timeRange: null, description: null }],
      [{ userId: "u1", startDate: "2026-08-24", endDate: "2026-08-24" }],
      WEEK,
    );
    expect(summary[0].days[0].hours).toBe(9);
  });

  it("keeps each user's entries isolated", () => {
    const summary = buildWeekSummary(
      [
        { id: "u1", name: "Anna", email: "a@example.com", weeklyCapacityHours: 40 },
        { id: "u2", name: "Ben", email: "b@example.com", weeklyCapacityHours: 20 },
      ],
      [{ userId: "u1", date: "2026-08-24", durationMinutes: 120, serviceLabel: null, timeRange: null, description: null }],
      [],
      WEEK,
    );
    expect(summary[0].totalHours).toBe(2);
    expect(summary[1].totalHours).toBe(0);
  });
});
