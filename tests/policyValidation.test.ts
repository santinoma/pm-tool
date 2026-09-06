import { describe, expect, it } from "vitest";
import { validateAgainstPolicy } from "../src/tenant/timeTracking/policyValidation";

const NO_LIMIT_POLICY = { maxDailyHours: null, blockWeekends: false, blockOverlaps: false };

describe("validateAgainstPolicy", () => {
  describe("no restrictions", () => {
    it("allows any entry when all policy flags are off/null", () => {
      const result = validateAgainstPolicy(
        { startedAt: new Date("2026-08-22T09:00:00Z"), endedAt: new Date("2026-08-22T10:00:00Z"), durationMinutes: 60 },
        [],
        NO_LIMIT_POLICY,
      );
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("blockWeekends", () => {
    const policy = { ...NO_LIMIT_POLICY, blockWeekends: true };

    it("rejects an entry on Saturday (UTC)", () => {
      // 2026-08-22 is a Saturday
      const result = validateAgainstPolicy(
        { startedAt: new Date("2026-08-22T09:00:00Z"), endedAt: new Date("2026-08-22T10:00:00Z"), durationMinutes: 60 },
        [],
        policy,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Zeiterfassung am Wochenende ist deaktiviert.");
    });

    it("rejects an entry on Sunday (UTC)", () => {
      // 2026-08-23 is a Sunday
      const result = validateAgainstPolicy(
        { startedAt: new Date("2026-08-23T09:00:00Z"), endedAt: new Date("2026-08-23T10:00:00Z"), durationMinutes: 60 },
        [],
        policy,
      );
      expect(result.valid).toBe(false);
    });

    it("allows an entry on a weekday (UTC)", () => {
      // 2026-08-24 is a Monday
      const result = validateAgainstPolicy(
        { startedAt: new Date("2026-08-24T09:00:00Z"), endedAt: new Date("2026-08-24T10:00:00Z"), durationMinutes: 60 },
        [],
        policy,
      );
      expect(result.valid).toBe(true);
    });

    it("does not block a weekend entry when the flag is off", () => {
      const result = validateAgainstPolicy(
        { startedAt: new Date("2026-08-22T09:00:00Z"), endedAt: new Date("2026-08-22T10:00:00Z"), durationMinutes: 60 },
        [],
        NO_LIMIT_POLICY,
      );
      expect(result.valid).toBe(true);
    });

    it("does not evaluate weekend rule when entry has no startedAt", () => {
      const result = validateAgainstPolicy(
        { startedAt: null, endedAt: null, durationMinutes: 60 },
        [],
        policy,
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("maxDailyHours", () => {
    const policy = { ...NO_LIMIT_POLICY, maxDailyHours: 8 };
    const day = "2026-08-24T"; // Monday

    it("allows an entry that stays within the daily limit", () => {
      const result = validateAgainstPolicy(
        { startedAt: new Date(`${day}09:00:00Z`), endedAt: new Date(`${day}12:00:00Z`), durationMinutes: 180 },
        [],
        policy,
      );
      expect(result.valid).toBe(true);
    });

    it("allows an entry that exactly hits the daily limit", () => {
      const result = validateAgainstPolicy(
        { startedAt: new Date(`${day}09:00:00Z`), endedAt: new Date(`${day}17:00:00Z`), durationMinutes: 480 },
        [],
        policy,
      );
      expect(result.valid).toBe(true);
    });

    it("rejects an entry that alone exceeds the daily limit", () => {
      const result = validateAgainstPolicy(
        { startedAt: new Date(`${day}09:00:00Z`), endedAt: new Date(`${day}18:00:00Z`), durationMinutes: 540 },
        [],
        policy,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Tages-Limit von 8h überschritten.");
    });

    it("sums existing same-day entries against the new entry", () => {
      const existing = [
        { startedAt: new Date(`${day}08:00:00Z`), endedAt: new Date(`${day}12:00:00Z`), durationMinutes: 240 },
        { startedAt: new Date(`${day}13:00:00Z`), endedAt: new Date(`${day}16:00:00Z`), durationMinutes: 180 },
      ];
      const result = validateAgainstPolicy(
        { startedAt: new Date(`${day}16:00:00Z`), endedAt: new Date(`${day}18:00:00Z`), durationMinutes: 120 },
        existing,
        policy,
      );
      // 240 + 180 + 120 = 540 > 480
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Tages-Limit von 8h überschritten.");
    });

    it("ignores existing entries from a different day", () => {
      const existing = [
        { startedAt: new Date("2026-08-23T08:00:00Z"), endedAt: new Date("2026-08-23T16:00:00Z"), durationMinutes: 480 },
      ];
      const result = validateAgainstPolicy(
        { startedAt: new Date(`${day}09:00:00Z`), endedAt: new Date(`${day}12:00:00Z`), durationMinutes: 180 },
        existing,
        policy,
      );
      expect(result.valid).toBe(true);
    });

    it("is skipped entirely when maxDailyHours is null", () => {
      const result = validateAgainstPolicy(
        { startedAt: new Date(`${day}09:00:00Z`), endedAt: new Date(`${day}23:00:00Z`), durationMinutes: 840 },
        [],
        NO_LIMIT_POLICY,
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("blockOverlaps", () => {
    const policy = { ...NO_LIMIT_POLICY, blockOverlaps: true };
    const day = "2026-08-24T"; // Monday

    it("rejects an entry that overlaps an existing entry", () => {
      const existing = [
        { startedAt: new Date(`${day}09:00:00Z`), endedAt: new Date(`${day}11:00:00Z`), durationMinutes: 120 },
      ];
      const result = validateAgainstPolicy(
        { startedAt: new Date(`${day}10:00:00Z`), endedAt: new Date(`${day}12:00:00Z`), durationMinutes: 120 },
        existing,
        policy,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Überschneidung mit bestehendem Zeiteintrag.");
    });

    it("allows back-to-back entries that touch but do not overlap", () => {
      const existing = [
        { startedAt: new Date(`${day}09:00:00Z`), endedAt: new Date(`${day}11:00:00Z`), durationMinutes: 120 },
      ];
      const result = validateAgainstPolicy(
        { startedAt: new Date(`${day}11:00:00Z`), endedAt: new Date(`${day}12:00:00Z`), durationMinutes: 60 },
        existing,
        policy,
      );
      expect(result.valid).toBe(true);
    });

    it("allows non-overlapping entries on the same day", () => {
      const existing = [
        { startedAt: new Date(`${day}09:00:00Z`), endedAt: new Date(`${day}10:00:00Z`), durationMinutes: 60 },
      ];
      const result = validateAgainstPolicy(
        { startedAt: new Date(`${day}14:00:00Z`), endedAt: new Date(`${day}15:00:00Z`), durationMinutes: 60 },
        existing,
        policy,
      );
      expect(result.valid).toBe(true);
    });

    it("ignores overlapping entries on a different day", () => {
      const existing = [
        { startedAt: new Date("2026-08-23T09:00:00Z"), endedAt: new Date("2026-08-23T11:00:00Z"), durationMinutes: 120 },
      ];
      const result = validateAgainstPolicy(
        { startedAt: new Date(`${day}09:00:00Z`), endedAt: new Date(`${day}10:00:00Z`), durationMinutes: 60 },
        existing,
        policy,
      );
      expect(result.valid).toBe(true);
    });

    it("skips the check entirely when the new entry has no endedAt (e.g. manual duration entry)", () => {
      const existing = [
        { startedAt: new Date(`${day}09:00:00Z`), endedAt: new Date(`${day}11:00:00Z`), durationMinutes: 120 },
      ];
      const result = validateAgainstPolicy(
        { startedAt: new Date(`${day}09:30:00Z`), endedAt: null, durationMinutes: 60 },
        existing,
        policy,
      );
      expect(result.valid).toBe(true);
    });

    it("is skipped entirely when blockOverlaps is off", () => {
      const existing = [
        { startedAt: new Date(`${day}09:00:00Z`), endedAt: new Date(`${day}11:00:00Z`), durationMinutes: 120 },
      ];
      const result = validateAgainstPolicy(
        { startedAt: new Date(`${day}10:00:00Z`), endedAt: new Date(`${day}12:00:00Z`), durationMinutes: 120 },
        existing,
        NO_LIMIT_POLICY,
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("combined rules", () => {
    it("reports the weekend violation even if daily limit would also be exceeded (weekend checked first)", () => {
      const policy = { maxDailyHours: 1, blockWeekends: true, blockOverlaps: true };
      const existing = [
        { startedAt: new Date("2026-08-22T08:00:00Z"), endedAt: new Date("2026-08-22T09:00:00Z"), durationMinutes: 60 },
      ];
      const result = validateAgainstPolicy(
        { startedAt: new Date("2026-08-22T08:30:00Z"), endedAt: new Date("2026-08-22T10:00:00Z"), durationMinutes: 90 },
        existing,
        policy,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Zeiterfassung am Wochenende ist deaktiviert.");
    });

    it("passes all rules simultaneously when the entry is valid under every constraint", () => {
      const policy = { maxDailyHours: 8, blockWeekends: true, blockOverlaps: true };
      const existing = [
        { startedAt: new Date("2026-08-24T09:00:00Z"), endedAt: new Date("2026-08-24T11:00:00Z"), durationMinutes: 120 },
      ];
      const result = validateAgainstPolicy(
        { startedAt: new Date("2026-08-24T13:00:00Z"), endedAt: new Date("2026-08-24T15:00:00Z"), durationMinutes: 120 },
        existing,
        policy,
      );
      expect(result.valid).toBe(true);
    });

    it("catches overlap even when weekday and within daily limit", () => {
      const policy = { maxDailyHours: 8, blockWeekends: true, blockOverlaps: true };
      const existing = [
        { startedAt: new Date("2026-08-24T09:00:00Z"), endedAt: new Date("2026-08-24T11:00:00Z"), durationMinutes: 120 },
      ];
      const result = validateAgainstPolicy(
        { startedAt: new Date("2026-08-24T10:00:00Z"), endedAt: new Date("2026-08-24T10:30:00Z"), durationMinutes: 30 },
        existing,
        policy,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Überschneidung mit bestehendem Zeiteintrag.");
    });
  });
});
