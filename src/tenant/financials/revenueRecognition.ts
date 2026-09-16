export interface RecognitionSectionInput {
  billingType: "fixed" | "time_and_materials" | "non_billable" | "percentage";
  recognitionMethod: "immediate" | "straight_line";
  totalAmount: number; // price * quantity
  approvedWorkAmount: number; // sum of approved TimeEntry.amount for this section
}

export interface RecognitionBudgetWindow {
  startDate: Date | null;
  endDate: Date | null;
  /** Productive's "delivered budget" fallback: once set, Fixed/Percentage services recognize in full. */
  deliveredAt: Date | null;
}

/**
 * Matches Productive's real revenue-recognition model (help: "Understanding
 * Revenue Recognition"): recognition is driven by approved work, not by
 * invoicing. Time & Materials services always recognize as time is approved
 * (plus approved billable expenses, which aren't section-scoped in this
 * schema — see `approvedExpenseAmount`), independent of `recognitionMethod`.
 * Fixed and Percentage services instead follow the date-based model: fully
 * recognized once the budget is delivered (`deliveredAt`), otherwise either
 * "on a single date" (nothing until delivery) or spread evenly across the
 * budget's date range ("straight_line"). Non-billable services never
 * recognize revenue.
 */
export function computeRecognizedRevenue(
  sections: RecognitionSectionInput[],
  approvedExpenseAmount: number,
  budgetWindow: RecognitionBudgetWindow,
  asOfDate: Date,
): number {
  const { startDate, endDate, deliveredAt } = budgetWindow;
  const isDelivered = Boolean(deliveredAt && deliveredAt.getTime() <= asOfDate.getTime());

  const sectionRevenue = sections.reduce((sum, section) => {
    if (section.billingType === "time_and_materials") {
      const cap = section.totalAmount > 0 ? section.totalAmount : section.approvedWorkAmount;
      return sum + Math.min(section.approvedWorkAmount, cap);
    }
    if (section.billingType === "non_billable") {
      return sum;
    }
    // fixed / percentage: date-driven, independent of invoicing.
    if (isDelivered) {
      return sum + section.totalAmount;
    }
    if (section.recognitionMethod === "immediate") {
      return sum; // "recognized on a single date" — that date (delivery) hasn't happened yet.
    }
    if (!startDate || !endDate || endDate.getTime() <= startDate.getTime()) {
      return sum;
    }
    const totalMs = endDate.getTime() - startDate.getTime();
    const elapsedMs = Math.min(Math.max(asOfDate.getTime() - startDate.getTime(), 0), totalMs);
    return sum + section.totalAmount * (elapsedMs / totalMs);
  }, 0);

  return sectionRevenue + approvedExpenseAmount;
}
