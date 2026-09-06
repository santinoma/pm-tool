/**
 * Reine Validierungslogik für Time-Tracking-Policies (Tages-Limit, Wochenend-Sperre,
 * Überschneidungs-Sperre). Bewusst frei von DB-Zugriffen, damit die drei Regeln einzeln
 * und in Kombination unit-testbar sind — die Route lädt Policy + bestehende Einträge und
 * ruft nur `validateAgainstPolicy` auf.
 */

export interface PolicyEntryInput {
  startedAt: Date | null;
  endedAt: Date | null;
  durationMinutes: number | null;
}

export interface ExistingEntryForUser {
  startedAt: Date | null;
  endedAt: Date | null;
  durationMinutes: number | null;
}

export interface TimeTrackingPolicyLike {
  maxDailyHours: number | null;
  blockWeekends: boolean;
  blockOverlaps: boolean;
}

export interface PolicyValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Liefert das UTC-Datum (YYYY-MM-DD) einer Zeitangabe, um Einträge unabhängig von der
 * Uhrzeit demselben Kalendertag zuzuordnen.
 */
function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Samstag (6) oder Sonntag (0) in UTC. */
function isUtcWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function validateAgainstPolicy(
  entry: PolicyEntryInput,
  existingEntriesForUser: ExistingEntryForUser[],
  policy: TimeTrackingPolicyLike,
): PolicyValidationResult {
  const entryDate = entry.startedAt ?? null;

  // Wochenend-Sperre
  if (policy.blockWeekends && entryDate && isUtcWeekend(entryDate)) {
    return { valid: false, error: "Zeiterfassung am Wochenende ist deaktiviert." };
  }

  // Tages-Limit
  if (policy.maxDailyHours !== null && policy.maxDailyHours !== undefined && entryDate) {
    const dateKey = utcDateKey(entryDate);
    const sameDayMinutes = existingEntriesForUser
      .filter((existing) => existing.startedAt && utcDateKey(existing.startedAt) === dateKey)
      .reduce((sum, existing) => sum + (existing.durationMinutes ?? 0), 0);
    const totalMinutes = sameDayMinutes + (entry.durationMinutes ?? 0);
    const limitMinutes = policy.maxDailyHours * 60;
    if (totalMinutes > limitMinutes) {
      return {
        valid: false,
        error: `Tages-Limit von ${policy.maxDailyHours}h überschritten.`,
      };
    }
  }

  // Überschneidungs-Sperre
  if (policy.blockOverlaps && entry.startedAt && entry.endedAt) {
    const dateKey = utcDateKey(entry.startedAt);
    const overlaps = existingEntriesForUser.some((existing) => {
      if (!existing.startedAt || !existing.endedAt) return false;
      if (utcDateKey(existing.startedAt) !== dateKey) return false;
      return rangesOverlap(entry.startedAt!, entry.endedAt!, existing.startedAt, existing.endedAt);
    });
    if (overlaps) {
      return { valid: false, error: "Überschneidung mit bestehendem Zeiteintrag." };
    }
  }

  return { valid: true };
}
