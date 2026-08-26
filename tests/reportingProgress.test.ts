import { describe, expect, it } from "vitest";
import { computeProgress } from "../src/tenant/reporting/progress";

describe("computeProgress", () => {
  it("returns zero percent for an empty task list, avoiding division by zero", () => {
    expect(computeProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("computes 50% for 2 done out of 4 tasks", () => {
    const tasks = [
      { statusCategory: "done" as const },
      { statusCategory: "done" as const },
      { statusCategory: "not_started" as const },
      { statusCategory: "not_started" as const },
    ];
    expect(computeProgress(tasks)).toEqual({ done: 2, total: 4, percent: 50 });
  });

  it("computes 100% when all tasks are done", () => {
    const tasks = [{ statusCategory: "done" as const }, { statusCategory: "done" as const }];
    expect(computeProgress(tasks).percent).toBe(100);
  });
});
