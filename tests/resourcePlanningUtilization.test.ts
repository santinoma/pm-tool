import { describe, expect, it } from "vitest";
import { computeUtilization } from "../src/tenant/resourcePlanning/utilization";

describe("computeUtilization", () => {
  it("returns zero for an empty task list", () => {
    expect(computeUtilization([], 40)).toEqual({ plannedHours: 0, utilizationPercent: 0 });
  });

  it("sums estimated hours across tasks, treating missing estimates as zero", () => {
    const result = computeUtilization(
      [{ estimatedHours: 4 }, { estimatedHours: null }, { estimatedHours: 6 }],
      40,
    );
    expect(result.plannedHours).toBe(10);
  });

  it("computes utilization percent relative to weekly capacity", () => {
    const result = computeUtilization([{ estimatedHours: 20 }], 40);
    expect(result.utilizationPercent).toBe(50);
  });

  it("avoids division by zero when capacity is zero", () => {
    const result = computeUtilization([{ estimatedHours: 10 }], 0);
    expect(result.utilizationPercent).toBe(0);
  });
});
