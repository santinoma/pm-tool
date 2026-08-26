import { describe, expect, it } from "vitest";
import { computePortfolioProgress } from "../src/tenant/portfolios/portfolioProgress";

describe("computePortfolioProgress", () => {
  it("returns 0 for no tasks", () => {
    expect(computePortfolioProgress([])).toBe(0);
  });

  it("computes the percentage of done tasks", () => {
    const tasks = [
      { statusCategory: "done" as const },
      { statusCategory: "done" as const },
      { statusCategory: "started" as const },
      { statusCategory: "not_started" as const },
    ];
    expect(computePortfolioProgress(tasks)).toBe(50);
  });

  it("returns 100 when all tasks are done", () => {
    expect(computePortfolioProgress([{ statusCategory: "done" }])).toBe(100);
  });

  it("rounds to the nearest integer", () => {
    const tasks = [
      { statusCategory: "done" as const },
      { statusCategory: "started" as const },
      { statusCategory: "started" as const },
    ];
    expect(computePortfolioProgress(tasks)).toBe(33);
  });
});
