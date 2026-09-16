import { describe, expect, it } from "vitest";
import { computeRecognizedRevenue } from "../src/tenant/financials/revenueRecognition";

describe("computeRecognizedRevenue", () => {
  it("recognizes immediate sections exactly at their invoiced amount", () => {
    const recognized = computeRecognizedRevenue(
      [{ recognitionMethod: "immediate", totalAmount: 10000, invoicedAmount: 3000 }],
      { startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
      new Date("2026-06-01"),
    );
    expect(recognized).toBe(3000);
  });

  it("spreads a straight_line section evenly across the budget window", () => {
    const recognized = computeRecognizedRevenue(
      [{ recognitionMethod: "straight_line", totalAmount: 10000, invoicedAmount: 0 }],
      { startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2027-01-01T00:00:00Z") },
      new Date("2026-07-02T12:00:00Z"), // roughly the halfway point
    );
    expect(recognized).toBeGreaterThan(4900);
    expect(recognized).toBeLessThan(5100);
  });

  it("clamps straight_line recognition to 0 before the window starts", () => {
    const recognized = computeRecognizedRevenue(
      [{ recognitionMethod: "straight_line", totalAmount: 10000, invoicedAmount: 0 }],
      { startDate: new Date("2027-01-01"), endDate: new Date("2027-12-31") },
      new Date("2026-01-01"),
    );
    expect(recognized).toBe(0);
  });

  it("clamps straight_line recognition to the full amount after the window ends", () => {
    const recognized = computeRecognizedRevenue(
      [{ recognitionMethod: "straight_line", totalAmount: 10000, invoicedAmount: 0 }],
      { startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31") },
      new Date("2026-06-01"),
    );
    expect(recognized).toBe(10000);
  });

  it("falls back to invoiced amount for straight_line when the budget has no date range", () => {
    const recognized = computeRecognizedRevenue(
      [{ recognitionMethod: "straight_line", totalAmount: 10000, invoicedAmount: 2500 }],
      { startDate: null, endDate: null },
      new Date("2026-06-01"),
    );
    expect(recognized).toBe(2500);
  });

  it("sums recognized revenue across multiple sections with mixed methods", () => {
    const recognized = computeRecognizedRevenue(
      [
        { recognitionMethod: "immediate", totalAmount: 5000, invoicedAmount: 5000 },
        { recognitionMethod: "straight_line", totalAmount: 10000, invoicedAmount: 0 },
      ],
      { startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2027-01-01T00:00:00Z") },
      new Date("2026-01-01T00:00:00Z"),
    );
    expect(recognized).toBe(5000);
  });
});
