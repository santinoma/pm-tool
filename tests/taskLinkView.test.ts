import { describe, expect, it } from "vitest";
import { resolveLinkedTasks } from "../src/tenant/taskLinks/taskLinkView";

describe("resolveLinkedTasks", () => {
  it("resolves the other side when the given task is the source", () => {
    const result = resolveLinkedTasks([{ id: "l1", sourceTaskId: "t1", targetTaskId: "t2" }], "t1");
    expect(result).toEqual([{ linkId: "l1", taskId: "t2" }]);
  });

  it("resolves the other side when the given task is the target", () => {
    const result = resolveLinkedTasks([{ id: "l1", sourceTaskId: "t2", targetTaskId: "t1" }], "t1");
    expect(result).toEqual([{ linkId: "l1", taskId: "t2" }]);
  });

  it("resolves multiple links for the same task", () => {
    const result = resolveLinkedTasks(
      [
        { id: "l1", sourceTaskId: "t1", targetTaskId: "t2" },
        { id: "l2", sourceTaskId: "t3", targetTaskId: "t1" },
      ],
      "t1",
    );
    expect(result.map((r) => r.taskId).sort()).toEqual(["t2", "t3"]);
  });

  it("returns an empty list when there are no links", () => {
    expect(resolveLinkedTasks([], "t1")).toEqual([]);
  });
});
