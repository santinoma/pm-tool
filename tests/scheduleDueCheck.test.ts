import { describe, expect, it } from "vitest";
import { computeAutomationPeriodKey, isTimeAutomationDue } from "../src/tenant/automations/scheduleDueCheck";

describe("computeAutomationPeriodKey", () => {
  it("returns the day string for daily recurrence", () => {
    expect(computeAutomationPeriodKey(new Date("2026-03-05T14:00:00Z"), "time_daily")).toBe("2026-03-05");
  });

  it("returns the Monday of the week for weekly recurrence, regardless of weekday", () => {
    // 2026-03-05 is a Thursday; the week's Monday is 2026-03-02.
    expect(computeAutomationPeriodKey(new Date("2026-03-05T14:00:00Z"), "time_weekly")).toBe("2026-03-02");
  });
});

describe("isTimeAutomationDue", () => {
  it("is due when the period has not run yet and no scheduleTime restricts it", () => {
    expect(isTimeAutomationDue(new Date("2026-03-05T10:00:00Z"), "time_daily", null, null, null)).toBe(true);
  });

  it("is not due when the current period already ran", () => {
    expect(isTimeAutomationDue(new Date("2026-03-05T10:00:00Z"), "time_daily", null, null, "2026-03-05")).toBe(
      false,
    );
  });

  it("respects scheduleTime — not due before the configured time", () => {
    expect(isTimeAutomationDue(new Date("2026-03-05T08:00:00Z"), "time_daily", "09:00", null, null)).toBe(false);
  });

  it("respects scheduleTime — due once past the configured time", () => {
    expect(isTimeAutomationDue(new Date("2026-03-05T09:30:00Z"), "time_daily", "09:00", null, null)).toBe(true);
  });

  it("respects scheduleWeekday for weekly recurrence", () => {
    // 2026-03-05 is a Thursday (UTC day 4).
    expect(isTimeAutomationDue(new Date("2026-03-05T10:00:00Z"), "time_weekly", null, 1, null)).toBe(false);
    expect(isTimeAutomationDue(new Date("2026-03-05T10:00:00Z"), "time_weekly", null, 4, null)).toBe(true);
  });
});
