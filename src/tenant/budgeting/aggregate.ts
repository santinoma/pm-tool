export interface BudgetStatus {
  actualHours: number;
  actualAmount: number | null;
}

export function computeBudgetStatus(actualMinutes: number, hourlyRate: number | null): BudgetStatus {
  const actualHours = actualMinutes / 60;
  const actualAmount = hourlyRate != null ? actualHours * hourlyRate : null;
  return { actualHours, actualAmount };
}
