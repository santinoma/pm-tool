export type CostRateType = "hourly" | "weekly" | "biweekly" | "monthly" | "annual";

export interface CostRateHistoryEntryLike {
  rateType: CostRateType;
  amount: number;
  workHoursPerDay: number;
  startDate: Date;
  endDate: Date | null;
}

/**
 * Anzahl Arbeitstage (laut `workingDays`, Wochentags-Indizes 0=So…6=Sa) im
 * angegebenen Kalendermonat (UTC) — Basis für die Monats-/Jahres-Kapazität
 * bei der Stundensatz-Auflösung.
 */
export function countWorkingDaysInMonth(year: number, month: number, workingDays: number[]): number {
  const workingDaySet = new Set(workingDays);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
    if (workingDaySet.has(weekday)) count++;
  }
  return count;
}

export function countWorkingDaysInYear(year: number, workingDays: number[]): number {
  let count = 0;
  for (let month = 0; month < 12; month++) {
    count += countWorkingDaysInMonth(year, month, workingDays);
  }
  return count;
}

/**
 * Löst den effektiven Stundensatz eines Cost-Rate-Eintrags auf. Productive:
 * "dividing the cost by the full period's capacity ... For annual salaries
 * this is the full calendar year, for monthly salaries the full calendar
 * month." `workingDays` Standard = Mo–Fr, passend zu `TenantSettings.workingDays`.
 */
export function resolveHourlyCostForEntry(
  entry: Pick<CostRateHistoryEntryLike, "rateType" | "amount" | "workHoursPerDay">,
  asOf: Date,
  workingDays: number[] = [1, 2, 3, 4, 5],
): number {
  const { rateType, amount, workHoursPerDay } = entry;
  switch (rateType) {
    case "hourly":
      return amount;
    case "weekly":
      return amount / (workHoursPerDay * workingDays.length);
    case "biweekly":
      return amount / (workHoursPerDay * workingDays.length * 2);
    case "monthly": {
      const days = countWorkingDaysInMonth(asOf.getUTCFullYear(), asOf.getUTCMonth(), workingDays);
      return days > 0 ? amount / (workHoursPerDay * days) : 0;
    }
    case "annual": {
      const days = countWorkingDaysInYear(asOf.getUTCFullYear(), workingDays);
      return days > 0 ? amount / (workHoursPerDay * days) : 0;
    }
  }
}

/**
 * Der zu `asOf` gültige Eintrag: `startDate <= asOf` und (`endDate` fehlt
 * oder `endDate >= asOf`). Bei mehreren Treffern (sollte laut Datenmodell
 * nicht vorkommen) gewinnt der zuletzt gestartete.
 */
export function resolveCurrentCostRateEntry<T extends CostRateHistoryEntryLike>(entries: T[], asOf: Date): T | null {
  const time = asOf.getTime();
  const active = entries.filter(
    (entry) => entry.startDate.getTime() <= time && (entry.endDate === null || entry.endDate.getTime() >= time),
  );
  if (active.length === 0) return null;
  return active.reduce((latest, entry) => (entry.startDate.getTime() > latest.startDate.getTime() ? entry : latest));
}

export function resolveCurrentHourlyCost<T extends CostRateHistoryEntryLike>(
  entries: T[],
  asOf: Date,
  workingDays: number[] = [1, 2, 3, 4, 5],
): number | null {
  const current = resolveCurrentCostRateEntry(entries, asOf);
  if (!current) return null;
  return resolveHourlyCostForEntry(current, asOf, workingDays);
}
