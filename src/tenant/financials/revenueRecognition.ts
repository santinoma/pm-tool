export interface RecognitionSectionInput {
  recognitionMethod: "immediate" | "straight_line";
  totalAmount: number; // price * quantity
  invoicedAmount: number; // sum of non-draft invoice line item amounts for this section
}

/**
 * "immediate" recognizes revenue exactly when invoiced (today's behavior).
 * "straight_line" spreads a section's total amount evenly across the
 * budget's date range regardless of invoicing — matching Productive's
 * revenue-recognition model for Fixed-price services. Falls back to
 * "immediate" behavior when the budget has no usable date range.
 */
export function computeRecognizedRevenue(
  sections: RecognitionSectionInput[],
  budgetWindow: { startDate: Date | null; endDate: Date | null },
  asOfDate: Date,
): number {
  return sections.reduce((sum, section) => {
    if (section.recognitionMethod === "immediate") {
      return sum + section.invoicedAmount;
    }
    const { startDate, endDate } = budgetWindow;
    if (!startDate || !endDate || endDate.getTime() <= startDate.getTime()) {
      return sum + section.invoicedAmount;
    }
    const totalMs = endDate.getTime() - startDate.getTime();
    const elapsedMs = Math.min(Math.max(asOfDate.getTime() - startDate.getTime(), 0), totalMs);
    return sum + section.totalAmount * (elapsedMs / totalMs);
  }, 0);
}
