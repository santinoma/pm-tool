import { describe, expect, it } from "vitest";
import { WIDGET_CATALOG, WIDGET_CATALOG_BY_TYPE } from "../src/tenant/reporting/widgets";

describe("WIDGET_CATALOG", () => {
  it("has a unique type per entry", () => {
    const types = WIDGET_CATALOG.map((entry) => entry.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("is indexed by type in WIDGET_CATALOG_BY_TYPE", () => {
    for (const entry of WIDGET_CATALOG) {
      expect(WIDGET_CATALOG_BY_TYPE.get(entry.type)).toEqual(entry);
    }
  });

  it("only marks widgets with a project-scoped data shape as filterable", () => {
    const nonFilterable = WIDGET_CATALOG.filter((entry) => !entry.filterable).map((entry) => entry.type);
    expect(nonFilterable).toEqual(["my_utilization", "out_of_office", "time_spent_monthly", "time_spent_yearly"]);
  });
});
