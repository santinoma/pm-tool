import { describe, expect, it } from "vitest";
import { computeCycleInsights } from "../src/tenant/cycles/cycleInsights";

const CYCLE_START = new Date("2026-08-10T00:00:00.000Z");

describe("computeCycleInsights", () => {
  it("counts done tasks and sums their estimatedHours as velocity", () => {
    const insights = computeCycleInsights(
      [
        { statusCategory: "done", estimatedHours: 5, cycleAssignedAt: new Date("2026-08-01") },
        { statusCategory: "started", estimatedHours: 3, cycleAssignedAt: new Date("2026-08-01") },
      ],
      CYCLE_START,
    );
    expect(insights.doneTasks).toBe(1);
    expect(insights.velocity).toBe(5);
    expect(insights.totalTasks).toBe(2);
  });

  it("treats missing estimatedHours as 0", () => {
    const insights = computeCycleInsights(
      [{ statusCategory: "done", estimatedHours: null, cycleAssignedAt: new Date("2026-08-01") }],
      CYCLE_START,
    );
    expect(insights.velocity).toBe(0);
  });

  it("classifies tasks assigned before the cycle start as planned scope", () => {
    const insights = computeCycleInsights(
      [{ statusCategory: "not_started", estimatedHours: 4, cycleAssignedAt: new Date("2026-08-05") }],
      CYCLE_START,
    );
    expect(insights.plannedScopeHours).toBe(4);
    expect(insights.scopeCreepHours).toBe(0);
    expect(insights.scopeCreepPercent).toBe(0);
  });

  it("classifies tasks assigned after the cycle start as scope creep", () => {
    const insights = computeCycleInsights(
      [
        { statusCategory: "not_started", estimatedHours: 4, cycleAssignedAt: new Date("2026-08-05") },
        { statusCategory: "not_started", estimatedHours: 4, cycleAssignedAt: new Date("2026-08-15") },
      ],
      CYCLE_START,
    );
    expect(insights.plannedScopeHours).toBe(4);
    expect(insights.scopeCreepHours).toBe(4);
    expect(insights.scopeCreepPercent).toBe(50);
  });

  it("returns 0% scope creep when there are no hours at all", () => {
    const insights = computeCycleInsights([], CYCLE_START);
    expect(insights.scopeCreepPercent).toBe(0);
  });
});
