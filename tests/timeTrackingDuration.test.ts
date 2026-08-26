import { describe, expect, it } from "vitest";
import {
  aggregateByProject,
  aggregateByTask,
  computeDurationMinutes,
  validateEntryTarget,
} from "../src/tenant/timeTracking/duration";

describe("computeDurationMinutes", () => {
  it("computes whole minutes between two timestamps", () => {
    const start = new Date("2026-01-01T10:00:00Z");
    const end = new Date("2026-01-01T10:32:00Z");
    expect(computeDurationMinutes(start, end)).toBe(32);
  });

  it("never returns negative durations", () => {
    const start = new Date("2026-01-01T10:00:00Z");
    const end = new Date("2026-01-01T09:00:00Z");
    expect(computeDurationMinutes(start, end)).toBe(0);
  });
});

describe("aggregateByTask", () => {
  it("sums durations per task, ignoring project-only entries", () => {
    const result = aggregateByTask([
      { taskId: "t1", projectId: null, durationMinutes: 30 },
      { taskId: "t1", projectId: null, durationMinutes: 15 },
      { taskId: null, projectId: "p1", durationMinutes: 60 },
    ]);
    expect(result).toEqual({ t1: 45 });
  });
});

describe("aggregateByProject", () => {
  const links = [
    { taskId: "t1", projectId: "p1", isPrimary: true },
    { taskId: "t1", projectId: "p2", isPrimary: false }, // cross-tagged, not primary
  ];

  it("sums task-bound entries under their primary project only", () => {
    const result = aggregateByProject(
      [{ taskId: "t1", projectId: null, durationMinutes: 30 }],
      links,
    );
    expect(result).toEqual({ p1: 30 });
    expect(result.p2).toBeUndefined();
  });

  it("sums project-bound entries directly", () => {
    const result = aggregateByProject(
      [{ taskId: null, projectId: "p3", durationMinutes: 20 }],
      links,
    );
    expect(result).toEqual({ p3: 20 });
  });

  it("combines both sources without double counting", () => {
    const result = aggregateByProject(
      [
        { taskId: "t1", projectId: null, durationMinutes: 30 },
        { taskId: null, projectId: "p1", durationMinutes: 10 },
      ],
      links,
    );
    expect(result).toEqual({ p1: 40 });
  });
});

describe("validateEntryTarget", () => {
  it("rejects an entry with neither taskId nor projectId", () => {
    expect(validateEntryTarget({}, true).valid).toBe(false);
  });

  it("accepts a task-bound entry regardless of the project-level setting", () => {
    expect(validateEntryTarget({ taskId: "t1" }, false).valid).toBe(true);
  });

  it("rejects a project-only entry when project-level booking is disabled", () => {
    const result = validateEntryTarget({ projectId: "p1" }, false);
    expect(result.valid).toBe(false);
  });

  it("accepts a project-only entry when project-level booking is enabled", () => {
    expect(validateEntryTarget({ projectId: "p1" }, true).valid).toBe(true);
  });
});
