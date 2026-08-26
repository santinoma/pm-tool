import { describe, expect, it } from "vitest";
import { computeBaselineDiff } from "../src/tenant/baselines/computeBaselineDiff";

describe("computeBaselineDiff", () => {
  it("marks a task missing from current data as removed", () => {
    const diff = computeBaselineDiff(
      [
        {
          taskId: "t1",
          taskTitle: "Task 1",
          dueDate: new Date("2026-01-01"),
          estimatedHours: 5,
          statusCategory: "not_started",
        },
      ],
      [],
    );
    expect(diff).toEqual([
      {
        taskId: "t1",
        taskTitle: "Task 1",
        removed: true,
        dueDateShiftDays: null,
        estimatedHoursDelta: null,
        statusChanged: false,
        baselineStatusCategory: "not_started",
        currentStatusCategory: null,
      },
    ]);
  });

  it("computes a positive due-date shift when the due date moved later", () => {
    const diff = computeBaselineDiff(
      [
        {
          taskId: "t1",
          taskTitle: "Task 1",
          dueDate: new Date("2026-01-01"),
          estimatedHours: null,
          statusCategory: "not_started",
        },
      ],
      [{ taskId: "t1", dueDate: new Date("2026-01-08"), estimatedHours: null, statusCategory: "not_started" }],
    );
    expect(diff[0].dueDateShiftDays).toBe(7);
  });

  it("computes estimated-hours delta and detects a status change", () => {
    const diff = computeBaselineDiff(
      [
        {
          taskId: "t1",
          taskTitle: "Task 1",
          dueDate: null,
          estimatedHours: 5,
          statusCategory: "not_started",
        },
      ],
      [{ taskId: "t1", dueDate: null, estimatedHours: 8, statusCategory: "done" }],
    );
    expect(diff[0].estimatedHoursDelta).toBe(3);
    expect(diff[0].statusChanged).toBe(true);
    expect(diff[0].currentStatusCategory).toBe("done");
  });

  it("reports no drift for an unchanged task", () => {
    const diff = computeBaselineDiff(
      [
        {
          taskId: "t1",
          taskTitle: "Task 1",
          dueDate: new Date("2026-01-01"),
          estimatedHours: 5,
          statusCategory: "started",
        },
      ],
      [{ taskId: "t1", dueDate: new Date("2026-01-01"), estimatedHours: 5, statusCategory: "started" }],
    );
    expect(diff[0].dueDateShiftDays).toBe(0);
    expect(diff[0].estimatedHoursDelta).toBe(0);
    expect(diff[0].statusChanged).toBe(false);
  });
});
