import { describe, expect, it } from "vitest";
import {
  collectRequiredFieldKeys,
  findMissingRequiredFields,
  type TaskFieldState,
} from "../src/tenant/workflow/transitionValidation";

function emptyState(overrides: Partial<TaskFieldState> = {}): TaskFieldState {
  return {
    assignee: false,
    dueDate: false,
    estimatedHours: false,
    filledCustomFieldIds: new Set(),
    ...overrides,
  };
}

describe("collectRequiredFieldKeys", () => {
  it("matches a rule scoped to a specific fromStatus", () => {
    const rules = [{ fromStatusId: "todo", toStatusId: "done", requiredFieldKeys: ["assignee"] }];
    expect([...collectRequiredFieldKeys(rules, "todo", "done")]).toEqual(["assignee"]);
    expect([...collectRequiredFieldKeys(rules, "in-progress", "done")]).toEqual([]);
  });

  it("matches a wildcard rule (fromStatusId null) regardless of the source status", () => {
    const rules = [{ fromStatusId: null, toStatusId: "done", requiredFieldKeys: ["dueDate"] }];
    expect([...collectRequiredFieldKeys(rules, "todo", "done")]).toEqual(["dueDate"]);
    expect([...collectRequiredFieldKeys(rules, "in-progress", "done")]).toEqual(["dueDate"]);
  });

  it("unions required fields across multiple matching rules", () => {
    const rules = [
      { fromStatusId: null, toStatusId: "done", requiredFieldKeys: ["assignee"] },
      { fromStatusId: "todo", toStatusId: "done", requiredFieldKeys: ["dueDate"] },
    ];
    const keys = collectRequiredFieldKeys(rules, "todo", "done");
    expect(keys.has("assignee")).toBe(true);
    expect(keys.has("dueDate")).toBe(true);
  });

  it("ignores rules for a different target status", () => {
    const rules = [{ fromStatusId: null, toStatusId: "in-progress", requiredFieldKeys: ["assignee"] }];
    expect([...collectRequiredFieldKeys(rules, "todo", "done")]).toEqual([]);
  });
});

describe("findMissingRequiredFields", () => {
  it("returns nothing when all required fields are filled", () => {
    const missing = findMissingRequiredFields(
      new Set(["assignee", "dueDate"]),
      emptyState({ assignee: true, dueDate: true }),
      {},
    );
    expect(missing).toEqual([]);
  });

  it("reports missing built-in fields by label", () => {
    const missing = findMissingRequiredFields(new Set(["assignee"]), emptyState(), {});
    expect(missing).toEqual(["Zuständige Person"]);
  });

  it("reports a missing custom field by its label", () => {
    const missing = findMissingRequiredFields(new Set(["custom:field-1"]), emptyState(), {
      "field-1": "QA Sign-off",
    });
    expect(missing).toEqual(["QA Sign-off"]);
  });

  it("treats a filled custom field as satisfied", () => {
    const missing = findMissingRequiredFields(
      new Set(["custom:field-1"]),
      emptyState({ filledCustomFieldIds: new Set(["field-1"]) }),
      { "field-1": "QA Sign-off" },
    );
    expect(missing).toEqual([]);
  });
});
