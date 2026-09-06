import { describe, expect, it } from "vitest";
import { selectMatchingRules, type AutomationRuleInput } from "../src/tenant/automations/runAutomations";

function rule(overrides: Partial<AutomationRuleInput>): AutomationRuleInput {
  return {
    id: "rule-1",
    triggers: ["task_created"],
    conditionStatusCategory: null,
    isEnabled: true,
    actions: [],
    ...overrides,
  };
}

describe("selectMatchingRules", () => {
  it("matches a rule whose trigger equals the event type", () => {
    const rules = [rule({ triggers: ["task_created"] })];
    const matched = selectMatchingRules(rules, { type: "task_created", taskId: "t1" });
    expect(matched).toHaveLength(1);
  });

  it("does not match a rule for a different trigger", () => {
    const rules = [rule({ triggers: ["task_status_changed"] })];
    const matched = selectMatchingRules(rules, { type: "task_created", taskId: "t1" });
    expect(matched).toHaveLength(0);
  });

  it("skips disabled rules", () => {
    const rules = [rule({ triggers: ["task_created"], isEnabled: false })];
    const matched = selectMatchingRules(rules, { type: "task_created", taskId: "t1" });
    expect(matched).toHaveLength(0);
  });

  it("matches a status-changed rule with no condition regardless of category", () => {
    const rules = [rule({ triggers: ["task_status_changed"], conditionStatusCategory: null })];
    const matched = selectMatchingRules(rules, {
      type: "task_status_changed",
      taskId: "t1",
      statusCategory: "done",
    });
    expect(matched).toHaveLength(1);
  });

  it("only matches a status-changed rule when the condition category matches", () => {
    const rules = [rule({ triggers: ["task_status_changed"], conditionStatusCategory: "done" })];
    const matchesDone = selectMatchingRules(rules, {
      type: "task_status_changed",
      taskId: "t1",
      statusCategory: "done",
    });
    const matchesStarted = selectMatchingRules(rules, {
      type: "task_status_changed",
      taskId: "t1",
      statusCategory: "started",
    });
    expect(matchesDone).toHaveLength(1);
    expect(matchesStarted).toHaveLength(0);
  });

  it("matches a rule with multiple selected triggers on any one of them", () => {
    const rules = [rule({ triggers: ["task_created", "task_updated", "task_commented"] })];
    expect(selectMatchingRules(rules, { type: "task_updated", taskId: "t1" })).toHaveLength(1);
    expect(selectMatchingRules(rules, { type: "task_commented", taskId: "t1" })).toHaveLength(1);
    expect(selectMatchingRules(rules, { type: "task_status_changed", taskId: "t1" })).toHaveLength(0);
  });

  it("matches time-based triggers like any other trigger type", () => {
    const rules = [rule({ triggers: ["time_daily"] })];
    expect(selectMatchingRules(rules, { type: "time_daily", taskId: "t1" })).toHaveLength(1);
    expect(selectMatchingRules(rules, { type: "time_weekly", taskId: "t1" })).toHaveLength(0);
  });
});
