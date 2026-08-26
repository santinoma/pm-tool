export interface ProfitabilityTimeEntry {
  userId: string;
  durationMinutes: number;
  amount: number;
}

export interface ProfitabilityResult {
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
}

export function computeProfitability(
  entries: ProfitabilityTimeEntry[],
  internalCostRateByUserId: Record<string, number | null | undefined>,
): ProfitabilityResult {
  let revenue = 0;
  let cost = 0;
  for (const entry of entries) {
    revenue += entry.amount;
    const costRate = internalCostRateByUserId[entry.userId] ?? 0;
    cost += (entry.durationMinutes / 60) * costRate;
  }
  const margin = revenue - cost;
  const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;
  return { revenue, cost, margin, marginPercent };
}
