import { getUtcDateKey } from "../projects/dateUtils";
import { getCurrentWeekRange } from "../resourcePlanning/week";

export type CheckInRecurrence = "daily" | "weekly";

/**
 * Liefert einen stabilen Periodenschlüssel: für `daily` der Tagesstring, für `weekly` der
 * UTC-Montag-Datumsstring der Woche (unabhängig vom konkreten Wochentag des Aufrufs).
 */
export function computePeriodKey(date: Date, recurrence: CheckInRecurrence): string {
  if (recurrence === "daily") {
    return getUtcDateKey(date);
  }
  const { start } = getCurrentWeekRange(date);
  return getUtcDateKey(start);
}
