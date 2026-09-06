import { describe, expect, it } from "vitest";
import {
  runTasksReport,
  runTimeEntriesReport,
  runBudgetsReport,
  type TaskRow,
  type TimeEntryRow,
  type BudgetRow,
} from "../src/tenant/reporting/reportQuery";

const tasks: TaskRow[] = [
  {
    id: "t1",
    title: "Design Login",
    status: "In Arbeit",
    statusCategory: "started",
    assignee: "Alice",
    project: "Website",
    dueDate: "2026-08-20",
    estimatedHours: 4,
  },
  {
    id: "t2",
    title: "Fix bug",
    status: "Erledigt",
    statusCategory: "done",
    assignee: "Bob",
    project: "Website",
    dueDate: "2026-08-10",
    estimatedHours: 2,
  },
  {
    id: "t3",
    title: "Write docs",
    status: "Offen",
    statusCategory: "not_started",
    assignee: null,
    project: "Mobile App",
    dueDate: null,
    estimatedHours: null,
  },
  {
    id: "t4",
    title: "Design onboarding",
    status: "In Arbeit",
    statusCategory: "started",
    assignee: "Alice",
    project: "Mobile App",
    dueDate: "2026-09-01",
    estimatedHours: 8,
  },
];

describe("runTasksReport — filters", () => {
  it("returns all rows in a single 'Alle' group when no filters/groupBy are given", () => {
    const result = runTasksReport(tasks, []);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].key).toBe("Alle");
    expect(result.groups[0].rows).toHaveLength(4);
  });

  it("eq filters by exact string match", () => {
    const result = runTasksReport(tasks, [{ field: "assignee", operator: "eq", value: "Alice" }]);
    expect(result.groups[0].rows.map((r) => r.id)).toEqual(["t1", "t4"]);
  });

  it("neq excludes exact matches, including rows where the field is null", () => {
    const result = runTasksReport(tasks, [{ field: "assignee", operator: "neq", value: "Alice" }]);
    expect(result.groups[0].rows.map((r) => r.id).sort()).toEqual(["t2", "t3"]);
  });

  it("contains does a case-insensitive substring match", () => {
    const result = runTasksReport(tasks, [{ field: "title", operator: "contains", value: "design" }]);
    expect(result.groups[0].rows.map((r) => r.id)).toEqual(["t1", "t4"]);
  });

  it("contains never matches a null field", () => {
    const result = runTasksReport(tasks, [{ field: "assignee", operator: "contains", value: "a" }]);
    expect(result.groups[0].rows.map((r) => r.id)).not.toContain("t3");
  });

  it("gt compares numeric fields", () => {
    const result = runTasksReport(tasks, [{ field: "estimatedHours", operator: "gt", value: 3 }]);
    expect(result.groups[0].rows.map((r) => r.id).sort()).toEqual(["t1", "t4"]);
  });

  it("gt excludes rows with a null field entirely", () => {
    const result = runTasksReport(tasks, [{ field: "estimatedHours", operator: "gt", value: -1 }]);
    expect(result.groups[0].rows.map((r) => r.id)).not.toContain("t3");
  });

  it("lt compares date-like string fields chronologically", () => {
    const result = runTasksReport(tasks, [{ field: "dueDate", operator: "lt", value: "2026-08-15" }]);
    expect(result.groups[0].rows.map((r) => r.id)).toEqual(["t2"]);
  });

  it("combines multiple filters with AND semantics", () => {
    const result = runTasksReport(tasks, [
      { field: "project", operator: "eq", value: "Website" },
      { field: "statusCategory", operator: "neq", value: "done" },
    ]);
    expect(result.groups[0].rows.map((r) => r.id)).toEqual(["t1"]);
  });
});

describe("runTasksReport — grouping", () => {
  it("groups rows by an arbitrary field and sorts groups by key", () => {
    const result = runTasksReport(tasks, [], { field: "project" });
    expect(result.groups.map((g) => g.key)).toEqual(["Mobile App", "Website"]);
    expect(result.groups.find((g) => g.key === "Mobile App")?.rows).toHaveLength(2);
    expect(result.groups.find((g) => g.key === "Website")?.rows).toHaveLength(2);
  });

  it("buckets null group-by values under a placeholder key", () => {
    const result = runTasksReport(tasks, [], { field: "assignee" });
    const nullGroup = result.groups.find((g) => g.key === "—");
    expect(nullGroup?.rows.map((r) => r.id)).toEqual(["t3"]);
  });

  it("applies filters before grouping", () => {
    const result = runTasksReport(tasks, [{ field: "statusCategory", operator: "eq", value: "started" }], {
      field: "project",
    });
    expect(result.groups.map((g) => g.key)).toEqual(["Mobile App", "Website"]);
    expect(result.groups.reduce((sum, g) => sum + g.rows.length, 0)).toBe(2);
  });
});

describe("runTimeEntriesReport", () => {
  const entries: TimeEntryRow[] = [
    { id: "e1", user: "Alice", project: "Website", task: "Design Login", durationMinutes: 90, date: "2026-08-01" },
    { id: "e2", user: "Bob", project: "Website", task: "Fix bug", durationMinutes: 30, date: "2026-08-02" },
    { id: "e3", user: "Alice", project: "Mobile App", task: null, durationMinutes: 120, date: "2026-08-03" },
  ];

  it("filters by user and groups the remainder by project, summing nothing itself (aggregation is the caller's job)", () => {
    const result = runTimeEntriesReport(entries, [{ field: "user", operator: "eq", value: "Alice" }], {
      field: "project",
    });
    expect(result.groups.map((g) => g.key)).toEqual(["Mobile App", "Website"]);
    expect(result.groups.find((g) => g.key === "Website")?.rows.map((r) => r.id)).toEqual(["e1"]);
    expect(result.groups.find((g) => g.key === "Mobile App")?.rows.map((r) => r.id)).toEqual(["e3"]);
  });

  it("gt filters on durationMinutes", () => {
    const result = runTimeEntriesReport(entries, [{ field: "durationMinutes", operator: "gt", value: 60 }]);
    expect(result.groups[0].rows.map((r) => r.id).sort()).toEqual(["e1", "e3"]);
  });
});

describe("runBudgetsReport", () => {
  const budgets: BudgetRow[] = [
    {
      id: "b1",
      title: "Retainer Q3",
      project: "Website",
      budgetTotal: 1000,
      budgetUsed: 900,
      budgetRemaining: 100,
      usagePercent: 90,
    },
    {
      id: "b2",
      title: "Launch Campaign",
      project: "Mobile App",
      budgetTotal: 5000,
      budgetUsed: 1000,
      budgetRemaining: 4000,
      usagePercent: 20,
    },
  ];

  it("filters budgets over a usage threshold", () => {
    const result = runBudgetsReport(budgets, [{ field: "usagePercent", operator: "gt", value: 50 }]);
    expect(result.groups[0].rows.map((r) => r.id)).toEqual(["b1"]);
  });

  it("groups budgets by project", () => {
    const result = runBudgetsReport(budgets, [], { field: "project" });
    expect(result.groups.map((g) => g.key)).toEqual(["Mobile App", "Website"]);
  });
});
