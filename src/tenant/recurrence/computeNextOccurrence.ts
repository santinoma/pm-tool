export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  /** "every N [frequency]" — defaults to 1 when omitted or non-positive. */
  interval: number;
}

function resolveInterval(interval: number): number {
  return Number.isFinite(interval) && interval > 0 ? Math.floor(interval) : 1;
}

/** Anzahl Tage im gegebenen UTC-Monat (0-basierter monthIndex, jahresübergreifend sicher). */
function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Addiert Kalendermonate auf ein UTC-Datum, unter Beibehaltung der Uhrzeit-Anteile.
 * Der Tag-des-Monats wird auf die Monatslänge des Zielmonats geklemmt, statt in den
 * Folgemonat überzulaufen (z. B. 31. Jan + 1 Monat -> 28./29. Feb, nicht 3. März).
 */
function addUtcMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const day = date.getUTCDate();

  const targetMonthIndex = monthIndex + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const clampedDay = Math.min(day, daysInUtcMonth(targetYear, normalizedMonthIndex));

  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonthIndex,
      clampedDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

/** Addiert Kalenderjahre auf ein UTC-Datum, mit derselben Tag-Klemmung wie addUtcMonths (29. Feb -> 28. Feb). */
function addUtcYears(date: Date, years: number): Date {
  return addUtcMonths(date, years * 12);
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

/**
 * Berechnet das nächste Fälligkeitsdatum für einen wiederkehrenden Task. Reine Funktion:
 * keine Date.now()/Math.random()-Abhängigkeit, komplett aus den übergebenen Werten bestimmt.
 */
export function computeNextDueDate(currentDueDate: Date, config: RecurrenceConfig): Date {
  const interval = resolveInterval(config.interval);

  switch (config.frequency) {
    case "daily":
      return addUtcDays(currentDueDate, interval);
    case "weekly":
      return addUtcDays(currentDueDate, interval * 7);
    case "monthly":
      return addUtcMonths(currentDueDate, interval);
    case "yearly":
      return addUtcYears(currentDueDate, interval);
    default: {
      const exhaustiveCheck: never = config.frequency;
      throw new Error(`Unbekannte Wiederholungsfrequenz: ${exhaustiveCheck}`);
    }
  }
}
