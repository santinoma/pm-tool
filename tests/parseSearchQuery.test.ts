import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "../src/tenant/search/parseSearchQuery";

describe("parseSearchQuery", () => {
  it("treats a query with no modifiers as pure free text", () => {
    const result = parseSearchQuery("invoice bug");
    expect(result.hasModifiers).toBe(false);
    expect(result.freeText).toBe("invoice bug");
    expect(result.statusCategory).toBeUndefined();
  });

  it("recognizes status:done and normalizes a synonym", () => {
    const result = parseSearchQuery("status:done");
    expect(result.hasModifiers).toBe(true);
    expect(result.statusCategory).toBe("done");
    expect(result.freeText).toBe("");
  });

  it("normalizes status synonyms like 'todo' and 'in_progress'", () => {
    expect(parseSearchQuery("status:todo").statusCategory).toBe("not_started");
    expect(parseSearchQuery("status:in_progress").statusCategory).toBe("started");
  });

  it("recognizes assignee:me", () => {
    const result = parseSearchQuery("assignee:me");
    expect(result.assignee).toBe("me");
    expect(result.hasModifiers).toBe(true);
  });

  it("recognizes a quoted project value with spaces", () => {
    const result = parseSearchQuery('project:"Website Relaunch"');
    expect(result.project).toBe("Website Relaunch");
  });

  it("combines multiple modifiers with leftover free text", () => {
    const result = parseSearchQuery('status:done assignee:me project:"Website Relaunch" invoice');
    expect(result.statusCategory).toBe("done");
    expect(result.assignee).toBe("me");
    expect(result.project).toBe("Website Relaunch");
    expect(result.freeText).toBe("invoice");
  });

  it("ignores an unrecognized status value without throwing", () => {
    const result = parseSearchQuery("status:banana");
    expect(result.statusCategory).toBeUndefined();
    expect(result.hasModifiers).toBe(false);
  });
});
