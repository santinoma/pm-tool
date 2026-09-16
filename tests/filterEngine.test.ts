import { describe, expect, it } from "vitest";
import {
  evaluateCondition,
  evaluateFilterNode,
  isFilterGroup,
  parseFilterConfig,
  resolveDynamicPlaceholders,
  type FilterGroup,
} from "../src/tenant/views/filterEngine";

function fieldsOf(record: Record<string, unknown>) {
  return (field: string) => record[field];
}

describe("filterEngine: evaluateCondition", () => {
  it("equals / not_equals", () => {
    const get = fieldsOf({ status: "started" });
    expect(evaluateCondition({ field: "status", operator: "equals", value: "started" }, get)).toBe(true);
    expect(evaluateCondition({ field: "status", operator: "equals", value: "done" }, get)).toBe(false);
    expect(evaluateCondition({ field: "status", operator: "not_equals", value: "done" }, get)).toBe(true);
  });

  it("contains on strings is case-insensitive", () => {
    const get = fieldsOf({ title: "Fix Login Bug" });
    expect(evaluateCondition({ field: "title", operator: "contains", value: "login" }, get)).toBe(true);
    expect(evaluateCondition({ field: "title", operator: "contains", value: "signup" }, get)).toBe(false);
  });

  it("contains on arrays checks membership", () => {
    const get = fieldsOf({ tags: ["urgent", "backend"] });
    expect(evaluateCondition({ field: "tags", operator: "contains", value: "urgent" }, get)).toBe(true);
    expect(evaluateCondition({ field: "tags", operator: "contains", value: "frontend" }, get)).toBe(false);
  });

  it("not_contains is the inverse of contains", () => {
    const get = fieldsOf({ title: "Fix Login Bug" });
    expect(evaluateCondition({ field: "title", operator: "not_contains", value: "login" }, get)).toBe(false);
    expect(evaluateCondition({ field: "title", operator: "not_contains", value: "signup" }, get)).toBe(true);
  });

  it("is_empty / is_not_empty across null, undefined, empty string, empty array", () => {
    expect(evaluateCondition({ field: "x", operator: "is_empty" }, fieldsOf({ x: null }))).toBe(true);
    expect(evaluateCondition({ field: "x", operator: "is_empty" }, fieldsOf({ x: undefined }))).toBe(true);
    expect(evaluateCondition({ field: "x", operator: "is_empty" }, fieldsOf({ x: "" }))).toBe(true);
    expect(evaluateCondition({ field: "x", operator: "is_empty" }, fieldsOf({ x: [] }))).toBe(true);
    expect(evaluateCondition({ field: "x", operator: "is_empty" }, fieldsOf({ x: "value" }))).toBe(false);
    expect(evaluateCondition({ field: "x", operator: "is_not_empty" }, fieldsOf({ x: "value" }))).toBe(true);
    expect(evaluateCondition({ field: "x", operator: "is_not_empty" }, fieldsOf({ x: [] }))).toBe(false);
  });

  it("in / not_in", () => {
    const get = fieldsOf({ priority: "high" });
    expect(evaluateCondition({ field: "priority", operator: "in", value: ["high", "urgent"] }, get)).toBe(true);
    expect(evaluateCondition({ field: "priority", operator: "in", value: ["low"] }, get)).toBe(false);
    expect(evaluateCondition({ field: "priority", operator: "not_in", value: ["low"] }, get)).toBe(true);
  });

  it("numeric comparisons: gt/lt/gte/lte", () => {
    const get = fieldsOf({ estimatedHours: 5 });
    expect(evaluateCondition({ field: "estimatedHours", operator: "gt", value: 3 }, get)).toBe(true);
    expect(evaluateCondition({ field: "estimatedHours", operator: "gt", value: 5 }, get)).toBe(false);
    expect(evaluateCondition({ field: "estimatedHours", operator: "gte", value: 5 }, get)).toBe(true);
    expect(evaluateCondition({ field: "estimatedHours", operator: "lt", value: 10 }, get)).toBe(true);
    expect(evaluateCondition({ field: "estimatedHours", operator: "lte", value: 5 }, get)).toBe(true);
  });

  it("numeric comparisons against a non-numeric actual value are false, not a crash", () => {
    const get = fieldsOf({ estimatedHours: "n/a" });
    expect(evaluateCondition({ field: "estimatedHours", operator: "gt", value: 3 }, get)).toBe(false);
  });
});

describe("filterEngine: evaluateFilterNode (AND/OR groups)", () => {
  it("AND requires every rule to pass", () => {
    const group: FilterGroup = {
      logic: "AND",
      rules: [
        { field: "status", operator: "equals", value: "started" },
        { field: "priority", operator: "equals", value: "high" },
      ],
    };
    expect(evaluateFilterNode(group, fieldsOf({ status: "started", priority: "high" }))).toBe(true);
    expect(evaluateFilterNode(group, fieldsOf({ status: "started", priority: "low" }))).toBe(false);
  });

  it("OR requires at least one rule to pass", () => {
    const group: FilterGroup = {
      logic: "OR",
      rules: [
        { field: "priority", operator: "equals", value: "high" },
        { field: "priority", operator: "equals", value: "urgent" },
      ],
    };
    expect(evaluateFilterNode(group, fieldsOf({ priority: "urgent" }))).toBe(true);
    expect(evaluateFilterNode(group, fieldsOf({ priority: "low" }))).toBe(false);
  });

  it("an empty group evaluates to true (no filter applied yet)", () => {
    expect(evaluateFilterNode({ logic: "AND", rules: [] }, fieldsOf({}))).toBe(true);
    expect(evaluateFilterNode({ logic: "OR", rules: [] }, fieldsOf({}))).toBe(true);
  });

  it("groups nest arbitrarily deep", () => {
    // (status = started AND priority = high) OR (status = done)
    const tree: FilterGroup = {
      logic: "OR",
      rules: [
        {
          logic: "AND",
          rules: [
            { field: "status", operator: "equals", value: "started" },
            { field: "priority", operator: "equals", value: "high" },
          ],
        },
        { field: "status", operator: "equals", value: "done" },
      ],
    };
    expect(evaluateFilterNode(tree, fieldsOf({ status: "started", priority: "high" }))).toBe(true);
    expect(evaluateFilterNode(tree, fieldsOf({ status: "done", priority: "low" }))).toBe(true);
    expect(evaluateFilterNode(tree, fieldsOf({ status: "started", priority: "low" }))).toBe(false);
  });
});

describe("filterEngine: isFilterGroup", () => {
  it("distinguishes conditions from groups", () => {
    expect(isFilterGroup({ field: "status", operator: "equals", value: "x" })).toBe(false);
    expect(isFilterGroup({ logic: "AND", rules: [] })).toBe(true);
  });
});

describe("filterEngine: parseFilterConfig", () => {
  it("passes a current-shape FilterGroup through unchanged", () => {
    const group: FilterGroup = { logic: "OR", rules: [{ field: "status", operator: "equals", value: "done" }] };
    expect(parseFilterConfig(group as unknown as Record<string, unknown>)).toEqual(group);
  });

  it("converts a legacy flat {statusFilter} shape into an equivalent single-condition group", () => {
    expect(parseFilterConfig({ statusFilter: "In Progress" })).toEqual({
      logic: "AND",
      rules: [{ field: "status", operator: "equals", value: "In Progress" }],
    });
  });

  it("returns an empty AND group for an empty or unrecognized config", () => {
    expect(parseFilterConfig({})).toEqual({ logic: "AND", rules: [] });
    expect(parseFilterConfig({ statusFilter: "" })).toEqual({ logic: "AND", rules: [] });
  });
});

describe("filterEngine: resolveDynamicPlaceholders", () => {
  it("resolves a top-level __ME__ condition", () => {
    const resolved = resolveDynamicPlaceholders({ field: "assigneeId", operator: "equals", value: "__ME__" }, "user-42");
    expect(resolved).toEqual({ field: "assigneeId", operator: "equals", value: "user-42" });
  });

  it("resolves __ME__ inside nested groups without touching other values", () => {
    const tree: FilterGroup = {
      logic: "AND",
      rules: [
        { field: "assigneeId", operator: "equals", value: "__ME__" },
        {
          logic: "OR",
          rules: [
            { field: "priority", operator: "equals", value: "high" },
            { field: "reviewerId", operator: "equals", value: "__ME__" },
          ],
        },
      ],
    };
    const resolved = resolveDynamicPlaceholders(tree, "user-42") as FilterGroup;
    expect(resolved.rules[0]).toEqual({ field: "assigneeId", operator: "equals", value: "user-42" });
    const nested = resolved.rules[1] as FilterGroup;
    expect(nested.rules[0]).toEqual({ field: "priority", operator: "equals", value: "high" });
    expect(nested.rules[1]).toEqual({ field: "reviewerId", operator: "equals", value: "user-42" });
  });
});
