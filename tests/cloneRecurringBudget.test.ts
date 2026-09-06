import { describe, expect, it } from "vitest";
import { buildRecurringBudgetClone } from "../src/tenant/budgeting/cloneRecurringBudget";

const sourceBudget = {
  title: "Retainer 2026",
  projectId: "project-1",
  ownerId: "user-1",
  recurrenceInterval: "monthly" as const,
};

const sourceSections = [
  {
    name: "Support",
    description: "Monatliches Support-Kontingent",
    quantity: 10,
    price: 100,
    serviceTypeId: "service-1",
    billingType: "time_and_materials" as const,
    trackingUnit: "hours" as const,
    discountPercent: null,
    markupPercent: null,
    guaranteedMaxPrice: null,
    blockOverrun: false,
    trackTime: true,
    trackExpenses: false,
    trackBooking: false,
    warningThresholdPercent: 80,
    position: 1,
  },
  {
    name: "Beratung",
    description: null,
    quantity: 5,
    price: 150,
    serviceTypeId: null,
    billingType: "fixed" as const,
    trackingUnit: "hours" as const,
    discountPercent: 10,
    markupPercent: null,
    guaranteedMaxPrice: 1000,
    blockOverrun: true,
    trackTime: false,
    trackExpenses: true,
    trackBooking: false,
    warningThresholdPercent: null,
    position: 0,
  },
];

describe("buildRecurringBudgetClone", () => {
  it("copies title, projectId, ownerId and recurrenceInterval from the source", () => {
    const clone = buildRecurringBudgetClone(sourceBudget, sourceSections);
    expect(clone.title).toBe(sourceBudget.title);
    expect(clone.projectId).toBe(sourceBudget.projectId);
    expect(clone.ownerId).toBe(sourceBudget.ownerId);
    expect(clone.recurrenceInterval).toBe("monthly");
  });

  it("marks the newly generated instance as a plain, non-retainer budget", () => {
    const clone = buildRecurringBudgetClone(sourceBudget, sourceSections);
    expect(clone.isRetainer).toBe(false);
  });

  it("does not carry over isScenario, scenarioOfId, deliveredAt or isTemplate", () => {
    const clone = buildRecurringBudgetClone(sourceBudget, sourceSections);
    expect(clone).not.toHaveProperty("isScenario");
    expect(clone).not.toHaveProperty("scenarioOfId");
    expect(clone).not.toHaveProperty("deliveredAt");
    expect(clone).not.toHaveProperty("isTemplate");
  });

  it("clones all sections sorted by position with a fresh budgetUsed of 0", () => {
    const clone = buildRecurringBudgetClone(sourceBudget, sourceSections);
    expect(clone.sections).toHaveLength(2);
    expect(clone.sections.map((s) => s.name)).toEqual(["Beratung", "Support"]);
    expect(clone.sections.every((s) => s.budgetUsed === 0)).toBe(true);
  });

  it("preserves section pricing and tracking fields", () => {
    const clone = buildRecurringBudgetClone(sourceBudget, sourceSections);
    const support = clone.sections.find((s) => s.name === "Support")!;
    expect(support.quantity).toBe(10);
    expect(support.price).toBe(100);
    expect(support.serviceTypeId).toBe("service-1");
    expect(support.billingType).toBe("time_and_materials");
    expect(support.trackingUnit).toBe("hours");
    expect(support.trackTime).toBe(true);
    expect(support.trackExpenses).toBe(false);
    expect(support.warningThresholdPercent).toBe(80);

    const beratung = clone.sections.find((s) => s.name === "Beratung")!;
    expect(beratung.discountPercent).toBe(10);
    expect(beratung.guaranteedMaxPrice).toBe(1000);
    expect(beratung.blockOverrun).toBe(true);
    expect(beratung.trackExpenses).toBe(true);
  });
});
