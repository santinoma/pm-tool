import { describe, expect, it } from "vitest";
import { computeNextDueDate } from "../src/tenant/recurrence/computeNextOccurrence";

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

describe("computeNextDueDate", () => {
  describe("daily", () => {
    it("adds 1 day by default interval", () => {
      const next = computeNextDueDate(new Date("2026-08-26T00:00:00.000Z"), {
        frequency: "daily",
        interval: 1,
      });
      expect(iso(next)).toBe("2026-08-27");
    });

    it("adds N days for interval > 1", () => {
      const next = computeNextDueDate(new Date("2026-08-26T00:00:00.000Z"), {
        frequency: "daily",
        interval: 5,
      });
      expect(iso(next)).toBe("2026-08-31");
    });

    it("rolls over month/year boundaries", () => {
      const next = computeNextDueDate(new Date("2026-12-30T00:00:00.000Z"), {
        frequency: "daily",
        interval: 3,
      });
      expect(iso(next)).toBe("2027-01-02");
    });
  });

  describe("weekly", () => {
    it("adds 7 days by default interval", () => {
      const next = computeNextDueDate(new Date("2026-08-26T00:00:00.000Z"), {
        frequency: "weekly",
        interval: 1,
      });
      expect(iso(next)).toBe("2026-09-02");
    });

    it("adds interval * 7 days for 'every 2 weeks'", () => {
      const next = computeNextDueDate(new Date("2026-08-26T00:00:00.000Z"), {
        frequency: "weekly",
        interval: 2,
      });
      expect(iso(next)).toBe("2026-09-09");
    });
  });

  describe("monthly", () => {
    it("adds 1 month keeping the same day-of-month", () => {
      const next = computeNextDueDate(new Date("2026-03-15T00:00:00.000Z"), {
        frequency: "monthly",
        interval: 1,
      });
      expect(iso(next)).toBe("2026-04-15");
    });

    it("adds interval months for 'every 3 months'", () => {
      const next = computeNextDueDate(new Date("2026-01-15T00:00:00.000Z"), {
        frequency: "monthly",
        interval: 3,
      });
      expect(iso(next)).toBe("2026-04-15");
    });

    it("clamps Jan 31 + 1 month to Feb 28 in a non-leap year (does not roll into March)", () => {
      const next = computeNextDueDate(new Date("2026-01-31T00:00:00.000Z"), {
        frequency: "monthly",
        interval: 1,
      });
      expect(iso(next)).toBe("2026-02-28");
    });

    it("clamps Jan 31 + 1 month to Feb 29 in a leap year", () => {
      const next = computeNextDueDate(new Date("2028-01-31T00:00:00.000Z"), {
        frequency: "monthly",
        interval: 1,
      });
      expect(iso(next)).toBe("2028-02-29");
    });

    it("clamps May 31 + 1 month to Jun 30", () => {
      const next = computeNextDueDate(new Date("2026-05-31T00:00:00.000Z"), {
        frequency: "monthly",
        interval: 1,
      });
      expect(iso(next)).toBe("2026-06-30");
    });

    it("rolls over into the next year", () => {
      const next = computeNextDueDate(new Date("2026-12-05T00:00:00.000Z"), {
        frequency: "monthly",
        interval: 2,
      });
      expect(iso(next)).toBe("2027-02-05");
    });
  });

  describe("yearly", () => {
    it("adds 1 year keeping month/day", () => {
      const next = computeNextDueDate(new Date("2026-08-26T00:00:00.000Z"), {
        frequency: "yearly",
        interval: 1,
      });
      expect(iso(next)).toBe("2027-08-26");
    });

    it("adds interval years for 'every 2 years'", () => {
      const next = computeNextDueDate(new Date("2026-08-26T00:00:00.000Z"), {
        frequency: "yearly",
        interval: 2,
      });
      expect(iso(next)).toBe("2028-08-26");
    });

    it("clamps Feb 29 (leap year) + 1 year to Feb 28 in a non-leap year", () => {
      const next = computeNextDueDate(new Date("2028-02-29T00:00:00.000Z"), {
        frequency: "yearly",
        interval: 1,
      });
      expect(iso(next)).toBe("2029-02-28");
    });
  });

  it("defaults interval to 1 when interval is non-positive or non-finite", () => {
    const zero = computeNextDueDate(new Date("2026-08-26T00:00:00.000Z"), {
      frequency: "daily",
      interval: 0,
    });
    expect(iso(zero)).toBe("2026-08-27");

    const negative = computeNextDueDate(new Date("2026-08-26T00:00:00.000Z"), {
      frequency: "daily",
      interval: -3,
    });
    expect(iso(negative)).toBe("2026-08-27");
  });
});
