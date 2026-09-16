import { describe, expect, it } from "vitest";
import { buildInvoiceLineItems, buildExpenseLineItems } from "../src/tenant/invoicing/generateInvoice";

describe("buildInvoiceLineItems", () => {
  it("groups entries by budget section into one line item each", () => {
    const result = buildInvoiceLineItems(
      [
        { id: "e1", budgetSectionId: "s1", durationMinutes: 60, amount: 120 },
        { id: "e2", budgetSectionId: "s1", durationMinutes: 30, amount: 60 },
        { id: "e3", budgetSectionId: "s2", durationMinutes: 60, amount: 80 },
      ],
      { s1: "PM Steuerung", s2: "Design" },
    );

    expect(result.lineItems).toHaveLength(2);
    const pm = result.lineItems.find((item) => item.budgetSectionId === "s1")!;
    expect(pm.quantityHours).toBe(1.5);
    expect(pm.amount).toBe(180);
    expect(pm.rate).toBe(120);
    expect(pm.description).toBe("PM Steuerung");

    const design = result.lineItems.find((item) => item.budgetSectionId === "s2")!;
    expect(design.quantityHours).toBe(1);
    expect(design.amount).toBe(80);
  });

  it("sums to a correct total and returns all consumed entry ids", () => {
    const result = buildInvoiceLineItems(
      [
        { id: "e1", budgetSectionId: "s1", durationMinutes: 60, amount: 100 },
        { id: "e2", budgetSectionId: "s2", durationMinutes: 60, amount: 50 },
      ],
      { s1: "A", s2: "B" },
    );
    expect(result.totalAmount).toBe(150);
    expect(result.timeEntryIds.sort()).toEqual(["e1", "e2"]);
  });

  it("returns no line items for an empty entry list", () => {
    const result = buildInvoiceLineItems([], {});
    expect(result.lineItems).toEqual([]);
    expect(result.totalAmount).toBe(0);
  });
});

describe("buildExpenseLineItems", () => {
  it("creates one line item per expense, with no budget section", () => {
    const result = buildExpenseLineItems([
      { id: "exp1", description: "Taxi zum Kunden", amount: 45 },
      { id: "exp2", description: "Hotel", amount: 120 },
    ]);

    expect(result.lineItems).toHaveLength(2);
    expect(result.lineItems.every((item) => item.budgetSectionId === null)).toBe(true);
    expect(result.lineItems.map((item) => item.expenseId).sort()).toEqual(["exp1", "exp2"]);
    expect(result.totalAmount).toBe(165);
    expect(result.expenseIds.sort()).toEqual(["exp1", "exp2"]);
    expect(result.timeEntryIds).toEqual([]);
  });

  it("returns nothing for an empty expense list", () => {
    const result = buildExpenseLineItems([]);
    expect(result.lineItems).toEqual([]);
    expect(result.totalAmount).toBe(0);
    expect(result.expenseIds).toEqual([]);
  });
});
