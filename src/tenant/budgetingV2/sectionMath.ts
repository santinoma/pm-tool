import { computeServiceTotal } from "../budgeting/servicePricing";

export interface SectionTotalsInput {
  quantity: number;
  price: number;
  budgetUsed: number;
  discountPercent?: number | null;
  markupPercent?: number | null;
}

export interface SectionTotals {
  budgetTotal: number;
  budgetRemaining: number;
  usagePercent: number;
}

export function computeSectionTotals(section: SectionTotalsInput): SectionTotals {
  const budgetTotal = computeServiceTotal(
    section.quantity,
    section.price,
    section.discountPercent ?? null,
    section.markupPercent ?? null,
  );
  const budgetRemaining = budgetTotal - section.budgetUsed;
  const usagePercent = budgetTotal > 0 ? (section.budgetUsed / budgetTotal) * 100 : 0;
  return { budgetTotal, budgetRemaining, usagePercent };
}
