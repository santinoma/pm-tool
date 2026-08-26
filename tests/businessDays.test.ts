import { describe, expect, it } from "vitest";
import { computeCreditedHours, countBusinessDays } from "../src/tenant/absence/businessDays";

describe("countBusinessDays", () => {
  it("counts a single weekday as 1", () => {
    expect(countBusinessDays(new Date("2026-08-24"), new Date("2026-08-24"))).toBe(1);
  });

  it("counts Mon–Fri as 5", () => {
    expect(countBusinessDays(new Date("2026-08-24"), new Date("2026-08-28"))).toBe(5);
  });

  it("excludes weekend days within the range", () => {
    expect(countBusinessDays(new Date("2026-08-24"), new Date("2026-08-30"))).toBe(5);
  });

  it("counts a single weekend day as 0", () => {
    expect(countBusinessDays(new Date("2026-08-29"), new Date("2026-08-29"))).toBe(0);
  });
});

describe("computeCreditedHours", () => {
  it("credits weeklyCapacityHours/5 per business day for a full-time user", () => {
    expect(computeCreditedHours(5, 40)).toBe(40);
  });

  it("scales down for part-time users", () => {
    expect(computeCreditedHours(5, 20)).toBe(20);
  });

  it("returns 0 for 0 business days", () => {
    expect(computeCreditedHours(0, 40)).toBe(0);
  });
});
