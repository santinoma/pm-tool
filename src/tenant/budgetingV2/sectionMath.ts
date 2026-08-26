export interface SectionTotalsInput {
  quantity: number;
  price: number;
  budgetUsed: number;
}

export interface SectionTotals {
  budgetTotal: number;
  budgetRemaining: number;
  usagePercent: number;
}

export function computeSectionTotals(section: SectionTotalsInput): SectionTotals {
  const budgetTotal = section.quantity * section.price;
  const budgetRemaining = budgetTotal - section.budgetUsed;
  const usagePercent = budgetTotal > 0 ? (section.budgetUsed / budgetTotal) * 100 : 0;
  return { budgetTotal, budgetRemaining, usagePercent };
}
