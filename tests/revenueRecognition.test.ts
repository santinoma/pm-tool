import { describe, expect, it } from "vitest";
import { computeRecognizedRevenue } from "../src/tenant/financials/revenueRecognition";

describe("computeRecognizedRevenue", () => {
  it("recognizes Time & Materials sections at their approved work amount, independent of invoicing", () => {
    const recognized = computeRecognizedRevenue(
      [{ billingType: "time_and_materials", recognitionMethod: "immediate", totalAmount: 10000, approvedWorkAmount: 3000 }],
      0,
      { startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), deliveredAt: null },
      new Date("2026-06-01"),
    );
    expect(recognized).toBe(3000);
  });

  it("caps Time & Materials recognition at the section's total amount", () => {
    const recognized = computeRecognizedRevenue(
      [{ billingType: "time_and_materials", recognitionMethod: "immediate", totalAmount: 5000, approvedWorkAmount: 8000 }],
      0,
      { startDate: null, endDate: null, deliveredAt: null },
      new Date("2026-06-01"),
    );
    expect(recognized).toBe(5000);
  });

  it("adds approved billable expenses on top of Time & Materials work", () => {
    const recognized = computeRecognizedRevenue(
      [{ billingType: "time_and_materials", recognitionMethod: "immediate", totalAmount: 10000, approvedWorkAmount: 3000 }],
      750,
      { startDate: null, endDate: null, deliveredAt: null },
      new Date("2026-06-01"),
    );
    expect(recognized).toBe(3750);
  });

  it("never recognizes revenue for non_billable sections", () => {
    const recognized = computeRecognizedRevenue(
      [{ billingType: "non_billable", recognitionMethod: "immediate", totalAmount: 10000, approvedWorkAmount: 3000 }],
      0,
      { startDate: null, endDate: null, deliveredAt: null },
      new Date("2026-06-01"),
    );
    expect(recognized).toBe(0);
  });

  it("spreads a Fixed straight_line section evenly across the budget window", () => {
    const recognized = computeRecognizedRevenue(
      [{ billingType: "fixed", recognitionMethod: "straight_line", totalAmount: 10000, approvedWorkAmount: 0 }],
      0,
      { startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2027-01-01T00:00:00Z"), deliveredAt: null },
      new Date("2026-07-02T12:00:00Z"), // roughly the halfway point
    );
    expect(recognized).toBeGreaterThan(4900);
    expect(recognized).toBeLessThan(5100);
  });

  it("clamps Fixed straight_line recognition to 0 before the window starts", () => {
    const recognized = computeRecognizedRevenue(
      [{ billingType: "fixed", recognitionMethod: "straight_line", totalAmount: 10000, approvedWorkAmount: 0 }],
      0,
      { startDate: new Date("2027-01-01"), endDate: new Date("2027-12-31"), deliveredAt: null },
      new Date("2026-01-01"),
    );
    expect(recognized).toBe(0);
  });

  it("clamps Fixed straight_line recognition to the full amount after the window ends", () => {
    const recognized = computeRecognizedRevenue(
      [{ billingType: "fixed", recognitionMethod: "straight_line", totalAmount: 10000, approvedWorkAmount: 0 }],
      0,
      { startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31"), deliveredAt: null },
      new Date("2026-06-01"),
    );
    expect(recognized).toBe(10000);
  });

  it("recognizes nothing for Fixed 'immediate' before delivery, and no date range means nothing either", () => {
    const recognized = computeRecognizedRevenue(
      [{ billingType: "fixed", recognitionMethod: "immediate", totalAmount: 10000, approvedWorkAmount: 0 }],
      0,
      { startDate: null, endDate: null, deliveredAt: null },
      new Date("2026-06-01"),
    );
    expect(recognized).toBe(0);
  });

  it("fully recognizes Fixed/Percentage sections once the budget is delivered, regardless of dates", () => {
    const recognized = computeRecognizedRevenue(
      [
        { billingType: "fixed", recognitionMethod: "immediate", totalAmount: 4000, approvedWorkAmount: 0 },
        { billingType: "percentage", recognitionMethod: "straight_line", totalAmount: 6000, approvedWorkAmount: 0 },
      ],
      0,
      { startDate: new Date("2027-01-01"), endDate: new Date("2027-12-31"), deliveredAt: new Date("2026-05-01") },
      new Date("2026-06-01"),
    );
    expect(recognized).toBe(10000);
  });

  it("does not recognize a delivery date that is still in the future", () => {
    const recognized = computeRecognizedRevenue(
      [{ billingType: "fixed", recognitionMethod: "immediate", totalAmount: 4000, approvedWorkAmount: 0 }],
      0,
      { startDate: null, endDate: null, deliveredAt: new Date("2026-12-01") },
      new Date("2026-06-01"),
    );
    expect(recognized).toBe(0);
  });

  it("sums recognized revenue across multiple sections with mixed billing types", () => {
    const recognized = computeRecognizedRevenue(
      [
        { billingType: "time_and_materials", recognitionMethod: "immediate", totalAmount: 5000, approvedWorkAmount: 5000 },
        { billingType: "fixed", recognitionMethod: "straight_line", totalAmount: 10000, approvedWorkAmount: 0 },
      ],
      0,
      { startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2027-01-01T00:00:00Z"), deliveredAt: null },
      new Date("2026-01-01T00:00:00Z"),
    );
    expect(recognized).toBe(5000);
  });
});
