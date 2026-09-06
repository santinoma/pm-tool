import { getUtcDateKey } from "@/tenant/projects/dateUtils";

export interface HolidayLike {
  date: Date;
}

/**
 * Prüft, ob `date` auf einen der übergebenen Feiertage fällt. Vergleich erfolgt über den
 * UTC-Datums-Schlüssel (YYYY-MM-DD), nicht über direkten Date-Vergleich, da Uhrzeitanteile
 * (z. B. Mitternacht vs. Tagesstempel aus der DB) sonst zu falschen Ergebnissen führen können.
 */
export function isHoliday(date: Date, holidays: HolidayLike[]): boolean {
  const key = getUtcDateKey(date);
  return holidays.some((holiday) => getUtcDateKey(holiday.date) === key);
}

/**
 * Reduziert die wöchentliche Basis-Kapazität proportional um die Anzahl der Feiertage, die in
 * `weekDays` fallen und für den Nutzer (laut zugewiesenem Feiertagskalender) gelten.
 *
 * Reine Funktion, unabhängig von der aufrufenden Ansicht (Task-basierte Resource-Planning-Seite
 * oder ein zukünftiges Booking-Grid) — nimmt nur die Basis-Kapazität, die Tage der betrachteten
 * Woche und die Feiertagsliste entgegen.
 */
export function computeEffectiveWeeklyCapacity(
  baseWeeklyCapacityHours: number,
  weekDays: Date[],
  holidays: HolidayLike[],
): number {
  if (weekDays.length === 0) {
    return baseWeeklyCapacityHours;
  }
  const holidayDaysInWeek = weekDays.filter((day) => isHoliday(day, holidays)).length;
  const workingDays = Math.max(0, weekDays.length - holidayDaysInWeek);
  return baseWeeklyCapacityHours * (workingDays / weekDays.length);
}
