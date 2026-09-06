import { describe, expect, it } from "vitest";
import { resolveViewFilters } from "../src/tenant/savedViews/resolveViewFilters";

describe("resolveViewFilters", () => {
  it("replaces a top-level __ME__ value with the current user's id", () => {
    const resolved = resolveViewFilters({ assigneeId: "__ME__", status: "open" }, "user-1");
    expect(resolved).toEqual({ assigneeId: "user-1", status: "open" });
  });

  it("leaves concrete values untouched", () => {
    const resolved = resolveViewFilters({ assigneeId: "user-2" }, "user-1");
    expect(resolved).toEqual({ assigneeId: "user-2" });
  });

  it("does not recurse into nested objects", () => {
    const resolved = resolveViewFilters({ nested: { assigneeId: "__ME__" } }, "user-1");
    expect(resolved).toEqual({ nested: { assigneeId: "__ME__" } });
  });

  it("does not mutate the input object", () => {
    const input = { assigneeId: "__ME__" };
    resolveViewFilters(input, "user-1");
    expect(input).toEqual({ assigneeId: "__ME__" });
  });

  it("returns an empty object for an empty filterConfig", () => {
    expect(resolveViewFilters({}, "user-1")).toEqual({});
  });
});
