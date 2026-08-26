export interface WeekRange {
  start: Date;
  end: Date;
}

/**
 * Liefert Montag 00:00:00.000 UTC bis Sonntag 23:59:59.999 UTC der Woche, die `date` enthält.
 * UTC-basiert, damit die Wochenzuordnung nicht von der lokalen Zeitzone abhängt.
 */
export function getCurrentWeekRange(date: Date): WeekRange {
  const weekday = (date.getUTCDay() + 6) % 7; // Montag = 0
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - weekday),
  );
  const end = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate() + 6,
      23,
      59,
      59,
      999,
    ),
  );
  return { start, end };
}

export function isWithinWeek(date: Date, week: WeekRange): boolean {
  return date.getTime() >= week.start.getTime() && date.getTime() <= week.end.getTime();
}
