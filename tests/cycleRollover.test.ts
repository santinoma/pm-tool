import { describe, expect, it } from "vitest";
import { findRolloverSourceCycleId } from "../src/tenant/cycles/rollover";

describe("findRolloverSourceCycleId", () => {
  it("picks the most recently ended cycle before the new cycle's start", () => {
    const sourceId = findRolloverSourceCycleId(
      [
        { id: "cycle-1", endDate: new Date("2026-08-10") },
        { id: "cycle-2", endDate: new Date("2026-08-24") },
      ],
      new Date("2026-08-25"),
    );
    expect(sourceId).toBe("cycle-2");
  });

  it("ignores cycles that haven't ended yet relative to the new cycle's start", () => {
    const sourceId = findRolloverSourceCycleId(
      [{ id: "cycle-1", endDate: new Date("2026-09-05") }],
      new Date("2026-08-25"),
    );
    expect(sourceId).toBeNull();
  });

  it("returns null when there is no prior cycle at all", () => {
    expect(findRolloverSourceCycleId([], new Date("2026-08-25"))).toBeNull();
  });
});
