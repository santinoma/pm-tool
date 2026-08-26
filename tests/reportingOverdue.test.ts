import { describe, expect, it } from "vitest";
import { computeOverdueTasks } from "../src/tenant/reporting/overdue";

const NOW = new Date("2026-08-25T12:00:00.000Z");

describe("computeOverdueTasks", () => {
  it("returns an empty array for an empty task list", () => {
    expect(computeOverdueTasks([], NOW)).toEqual([]);
  });

  it("excludes tasks without a dueDate", () => {
    const tasks = [{ id: "1", dueDate: null, statusCategory: "not_started" as const }];
    expect(computeOverdueTasks(tasks, NOW)).toHaveLength(0);
  });

  it("excludes tasks with a future dueDate", () => {
    const tasks = [
      { id: "1", dueDate: new Date("2026-09-01T00:00:00.000Z"), statusCategory: "not_started" as const },
    ];
    expect(computeOverdueTasks(tasks, NOW)).toHaveLength(0);
  });

  it("excludes done tasks even with a past dueDate", () => {
    const tasks = [
      { id: "1", dueDate: new Date("2026-08-01T00:00:00.000Z"), statusCategory: "done" as const },
    ];
    expect(computeOverdueTasks(tasks, NOW)).toHaveLength(0);
  });

  it("includes a non-done task with a past dueDate", () => {
    const tasks = [
      { id: "1", dueDate: new Date("2026-08-01T00:00:00.000Z"), statusCategory: "started" as const },
    ];
    expect(computeOverdueTasks(tasks, NOW)).toHaveLength(1);
  });
});
