export interface PeriodRange {
  start: Date;
  end: Date;
}

/** Montag 00:00:00.000 UTC bis Sonntag 23:59:59.999 UTC der Woche, die `date` enthält. */
function currentWeekRange(date: Date): PeriodRange {
  const weekday = (date.getUTCDay() + 6) % 7; // Montag = 0
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - weekday));
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999),
  );
  return { start, end };
}

/** 1. Tag 00:00:00.000 UTC bis letzter Tag 23:59:59.999 UTC des Kalendermonats, der `date` enthält. */
function currentMonthRange(date: Date): PeriodRange {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

export function computeCurrentPeriod(
  interval: "weekly" | "monthly",
  now: Date,
): PeriodRange {
  return interval === "weekly" ? currentWeekRange(now) : currentMonthRange(now);
}
