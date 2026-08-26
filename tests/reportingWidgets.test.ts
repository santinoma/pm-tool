import { describe, expect, it } from "vitest";
import { WIDGET_CATALOG, mergeWidgetPreferences } from "../src/tenant/reporting/widgets";

describe("mergeWidgetPreferences", () => {
  it("returns the catalog default order and all-enabled when there are no saved preferences", () => {
    const result = mergeWidgetPreferences(WIDGET_CATALOG, []);
    expect(result.every((w) => w.enabled)).toBe(true);
    expect(result.map((w) => w.type)).toEqual(WIDGET_CATALOG.map((c) => c.type));
  });

  it("overrides enabled and position for a widget with a saved preference", () => {
    const result = mergeWidgetPreferences(WIDGET_CATALOG, [
      { widgetType: "overdue_tasks", enabled: false, position: 99 },
    ]);
    const overdue = result.find((w) => w.type === "overdue_tasks")!;
    expect(overdue.enabled).toBe(false);
    expect(result[result.length - 1].type).toBe("overdue_tasks");
  });

  it("leaves unmentioned widgets at their catalog default", () => {
    const result = mergeWidgetPreferences(WIDGET_CATALOG, [
      { widgetType: "overdue_tasks", enabled: false, position: 99 },
    ]);
    const myTasks = result.find((w) => w.type === "my_tasks")!;
    expect(myTasks.enabled).toBe(true);
    expect(myTasks.position).toBe(1);
  });
});
