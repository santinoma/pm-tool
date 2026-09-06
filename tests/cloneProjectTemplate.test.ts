import { describe, expect, it } from "vitest";
import { buildClonedStatuses } from "../src/tenant/projectTemplates/cloneProjectTemplate";

describe("buildClonedStatuses", () => {
  it("sorts by position and strips out the original id", () => {
    const cloned = buildClonedStatuses([
      { name: "Done", category: "done", position: 2, isDefault: false },
      { name: "Todo", category: "not_started", position: 0, isDefault: true },
      { name: "In Progress", category: "started", position: 1, isDefault: false },
    ]);
    expect(cloned.map((s) => s.name)).toEqual(["Todo", "In Progress", "Done"]);
    expect(cloned[0]).not.toHaveProperty("id");
  });

  it("preserves isDefault flags", () => {
    const cloned = buildClonedStatuses([{ name: "Todo", category: "not_started", position: 0, isDefault: true }]);
    expect(cloned[0].isDefault).toBe(true);
  });
});
