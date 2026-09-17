import { describe, expect, it } from "vitest";
import { selectMatchingRules, type AutomationRuleInput, type AutomationTaskSnapshot } from "../src/tenant/automations/runAutomations";
import type { FilterGroup } from "../src/tenant/views/filterEngine";

function rule(overrides: Partial<AutomationRuleInput>): AutomationRuleInput {
  return {
    id: "rule-1",
    triggers: ["task_created"],
    conditionConfig: null,
    isEnabled: true,
    actions: [],
    ...overrides,
  };
}

function snapshot(overrides: Partial<AutomationTaskSnapshot> = {}): AutomationTaskSnapshot {
  return {
    statusCategory: null,
    assigneeId: null,
    isKeyTask: false,
    isPrivate: false,
    ...overrides,
  };
}

const conditionOn = (field: string, value: unknown): FilterGroup => ({
  logic: "AND",
  rules: [{ field, operator: "equals", value }],
});

describe("selectMatchingRules", () => {
  it("matches a rule whose trigger equals the event type", () => {
    const rules = [rule({ triggers: ["task_created"] })];
    const matched = selectMatchingRules(rules, { type: "task_created", taskId: "t1" }, snapshot());
    expect(matched).toHaveLength(1);
  });

  it("does not match a rule for a different trigger", () => {
    const rules = [rule({ triggers: ["task_status_changed"] })];
    const matched = selectMatchingRules(rules, { type: "task_created", taskId: "t1" }, snapshot());
    expect(matched).toHaveLength(0);
  });

  it("skips disabled rules", () => {
    const rules = [rule({ triggers: ["task_created"], isEnabled: false })];
    const matched = selectMatchingRules(rules, { type: "task_created", taskId: "t1" }, snapshot());
    expect(matched).toHaveLength(0);
  });

  it("matches a status-changed rule with no condition regardless of category", () => {
    const rules = [rule({ triggers: ["task_status_changed"], conditionConfig: null })];
    const matched = selectMatchingRules(
      rules,
      { type: "task_status_changed", taskId: "t1", statusCategory: "done" },
      snapshot({ statusCategory: "done" }),
    );
    expect(matched).toHaveLength(1);
  });

  it("only matches a status-changed rule when the condition category matches", () => {
    const rules = [rule({ triggers: ["task_status_changed"], conditionConfig: conditionOn("statusCategory", "done") })];
    const matchesDone = selectMatchingRules(
      rules,
      { type: "task_status_changed", taskId: "t1", statusCategory: "done" },
      snapshot({ statusCategory: "done" }),
    );
    const matchesStarted = selectMatchingRules(
      rules,
      { type: "task_status_changed", taskId: "t1", statusCategory: "started" },
      snapshot({ statusCategory: "started" }),
    );
    expect(matchesDone).toHaveLength(1);
    expect(matchesStarted).toHaveLength(0);
  });

  it("matches a rule with multiple selected triggers on any one of them", () => {
    const rules = [rule({ triggers: ["task_created", "task_updated", "task_commented"] })];
    expect(selectMatchingRules(rules, { type: "task_updated", taskId: "t1" }, snapshot())).toHaveLength(1);
    expect(selectMatchingRules(rules, { type: "task_commented", taskId: "t1" }, snapshot())).toHaveLength(1);
    expect(selectMatchingRules(rules, { type: "task_status_changed", taskId: "t1" }, snapshot())).toHaveLength(0);
  });

  it("matches time-based triggers like any other trigger type", () => {
    const rules = [rule({ triggers: ["time_daily"] })];
    expect(selectMatchingRules(rules, { type: "time_daily", taskId: "t1" }, snapshot())).toHaveLength(1);
    expect(selectMatchingRules(rules, { type: "time_weekly", taskId: "t1" }, snapshot())).toHaveLength(0);
  });

  it("T306: matches on a non-status attribute (isKeyTask) via the generic condition system", () => {
    const rules = [rule({ triggers: ["task_updated"], conditionConfig: conditionOn("isKeyTask", true) })];
    expect(selectMatchingRules(rules, { type: "task_updated", taskId: "t1" }, snapshot({ isKeyTask: true }))).toHaveLength(1);
    expect(selectMatchingRules(rules, { type: "task_updated", taskId: "t1" }, snapshot({ isKeyTask: false }))).toHaveLength(0);
  });

  it("T306: matches an AND condition across two attributes", () => {
    const rules = [
      rule({
        triggers: ["task_updated"],
        conditionConfig: {
          logic: "AND",
          rules: [
            { field: "statusCategory", operator: "equals", value: "started" },
            { field: "isPrivate", operator: "equals", value: false },
          ],
        },
      }),
    ];
    expect(
      selectMatchingRules(rules, { type: "task_updated", taskId: "t1" }, snapshot({ statusCategory: "started", isPrivate: false })),
    ).toHaveLength(1);
    expect(
      selectMatchingRules(rules, { type: "task_updated", taskId: "t1" }, snapshot({ statusCategory: "started", isPrivate: true })),
    ).toHaveLength(0);
  });
});
