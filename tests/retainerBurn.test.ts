import { describe, expect, it } from "vitest";
import { computeSectionBurn } from "../src/tenant/retainer/burn";

describe("computeSectionBurn", () => {
  it("computes used, remaining and usage percent for a section", () => {
    const burn = computeSectionBurn(
      [{ id: "s1", name: "PM Steuerung", quantity: 40 }],
      [{ budgetSectionId: "s1", durationMinutes: 600 }],
    );
    expect(burn[0].usedHours).toBe(10);
    expect(burn[0].remainingHours).toBe(30);
    expect(burn[0].usagePercent).toBe(25);
  });

  it("returns 0 used for a section with no entries in the period", () => {
    const burn = computeSectionBurn([{ id: "s1", name: "Design", quantity: 20 }], []);
    expect(burn[0].usedHours).toBe(0);
    expect(burn[0].remainingHours).toBe(20);
    expect(burn[0].usagePercent).toBe(0);
  });

  it("sums multiple entries for the same section", () => {
    const burn = computeSectionBurn(
      [{ id: "s1", name: "PM Steuerung", quantity: 40 }],
      [
        { budgetSectionId: "s1", durationMinutes: 60 },
        { budgetSectionId: "s1", durationMinutes: 120 },
      ],
    );
    expect(burn[0].usedHours).toBe(3);
  });

  it("ignores entries that belong to a different section", () => {
    const burn = computeSectionBurn(
      [{ id: "s1", name: "A", quantity: 10 }],
      [{ budgetSectionId: "s2", durationMinutes: 600 }],
    );
    expect(burn[0].usedHours).toBe(0);
  });

  it("allows usage to exceed 100% when over quota", () => {
    const burn = computeSectionBurn(
      [{ id: "s1", name: "A", quantity: 5 }],
      [{ budgetSectionId: "s1", durationMinutes: 600 }],
    );
    expect(burn[0].usedHours).toBe(10);
    expect(burn[0].remainingHours).toBe(-5);
    expect(burn[0].usagePercent).toBe(200);
  });
});
