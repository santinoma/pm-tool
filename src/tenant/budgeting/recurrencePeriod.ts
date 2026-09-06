import { getUtcDateKey } from "../projects/dateUtils";
import { getCurrentWeekRange } from "../resourcePlanning/week";

export type BudgetRecurrenceInterval = "weekly" | "monthly";

/**
 * Liefert einen stabilen Periodenschlüssel für wiederkehrende Budgets (Retainer):
 * für `weekly` der UTC-Montag-Datumsstring der Woche, für `monthly` ein
 * "YYYY-MM"-String (UTC) — unabhängig vom konkreten Tag des Aufrufs.
 */
export function computeBudgetPeriodKey(date: Date, interval: BudgetRecurrenceInterval): string {
  if (interval === "monthly") {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }
  const { start } = getCurrentWeekRange(date);
  return getUtcDateKey(start);
}
