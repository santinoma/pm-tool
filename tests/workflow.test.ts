import { describe, expect, it } from "vitest";
import { defaultWorkflowStatuses, detectDependencyCycle } from "../src/tenant/projects/workflow";

describe("defaultWorkflowStatuses", () => {
  it("returns three statuses with exactly one default (not_started)", () => {
    const statuses = defaultWorkflowStatuses();
    expect(statuses).toHaveLength(3);
    const defaults = statuses.filter((s) => s.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].category).toBe("not_started");
  });

  it("has a done status", () => {
    const statuses = defaultWorkflowStatuses();
    expect(statuses.some((s) => s.category === "done")).toBe(true);
  });
});

describe("detectDependencyCycle", () => {
  it("allows a simple acyclic edge", () => {
    expect(detectDependencyCycle([], { blockingTaskId: "a", blockedTaskId: "b" })).toBe(false);
  });

  it("rejects a task blocking itself", () => {
    expect(detectDependencyCycle([], { blockingTaskId: "a", blockedTaskId: "a" })).toBe(true);
  });

  it("rejects a direct cycle (a blocks b, then b blocks a)", () => {
    const existing = [{ blockingTaskId: "a", blockedTaskId: "b" }];
    expect(detectDependencyCycle(existing, { blockingTaskId: "b", blockedTaskId: "a" })).toBe(
      true,
    );
  });

  it("rejects a transitive cycle (a blocks b, b blocks c, then c blocks a)", () => {
    const existing = [
      { blockingTaskId: "a", blockedTaskId: "b" },
      { blockingTaskId: "b", blockedTaskId: "c" },
    ];
    expect(detectDependencyCycle(existing, { blockingTaskId: "c", blockedTaskId: "a" })).toBe(
      true,
    );
  });

  it("allows a new edge that does not close a cycle", () => {
    const existing = [
      { blockingTaskId: "a", blockedTaskId: "b" },
      { blockingTaskId: "b", blockedTaskId: "c" },
    ];
    expect(detectDependencyCycle(existing, { blockingTaskId: "a", blockedTaskId: "d" })).toBe(
      false,
    );
  });
});
