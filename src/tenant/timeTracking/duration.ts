export function computeDurationMinutes(startedAt: Date, endedAt: Date): number {
  return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
}

export interface TimeEntryLike {
  taskId: string | null;
  projectId: string | null;
  durationMinutes: number | null;
}

export function aggregateByTask(entries: TimeEntryLike[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.taskId && entry.durationMinutes) {
      result[entry.taskId] = (result[entry.taskId] ?? 0) + entry.durationMinutes;
    }
  }
  return result;
}

export interface TaskProjectLinkLike {
  taskId: string;
  projectId: string;
  isPrimary: boolean;
}

/**
 * Summiert Zeiteinträge pro Projekt: direkt am Projekt gebuchte Einträge plus Einträge an
 * Tasks, deren PRIMÄRES Projekt dieses ist. Cross-getaggte (nicht-primäre) Verknüpfungen
 * zählen bewusst nicht mit, damit Zeit bei mehrfach verknüpften Tasks nicht doppelt gezählt wird.
 */
export function aggregateByProject(
  entries: TimeEntryLike[],
  taskProjectLinks: TaskProjectLinkLike[],
): Record<string, number> {
  const primaryProjectByTask = new Map<string, string>();
  for (const link of taskProjectLinks) {
    if (link.isPrimary) {
      primaryProjectByTask.set(link.taskId, link.projectId);
    }
  }

  const result: Record<string, number> = {};
  for (const entry of entries) {
    if (!entry.durationMinutes) continue;
    const projectId = entry.projectId ?? (entry.taskId ? primaryProjectByTask.get(entry.taskId) : undefined);
    if (projectId) {
      result[projectId] = (result[projectId] ?? 0) + entry.durationMinutes;
    }
  }
  return result;
}

export interface DatedTimeEntryLike {
  durationMinutes: number | null;
  startedAt: Date | null;
  createdAt: Date;
}

/**
 * Summiert Zeiteinträge eines Users nach Periodenschlüssel (z.B. ISO-Woche
 * "2026-W36" oder Monat "2026-09"), zur Anzeige in den Dashboard-Widgets
 * "My monthly/yearly time spent". `startedAt` ist bei manuellen Dauer-Einträgen
 * oft null — dann dient `createdAt` als Ersatzdatum (gleiches Muster wie
 * `getEntryDate` in `tenant/timeTracking/approval.ts`).
 */
export function aggregateByUserPeriod(
  entries: DatedTimeEntryLike[],
  periodKey: (date: Date) => string,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const entry of entries) {
    if (!entry.durationMinutes) continue;
    const key = periodKey(entry.startedAt ?? entry.createdAt);
    result[key] = (result[key] ?? 0) + entry.durationMinutes;
  }
  return result;
}

export function isoWeekKey(date: Date): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}/W${String(week).padStart(2, "0")}`;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export interface EntryTarget {
  taskId?: string | null;
  projectId?: string | null;
}

export interface EntryTargetValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateEntryTarget(
  target: EntryTarget,
  allowProjectLevel: boolean,
): EntryTargetValidationResult {
  const hasTask = Boolean(target.taskId);
  const hasProject = Boolean(target.projectId);

  if (!hasTask && !hasProject) {
    return { valid: false, reason: "Zeiteintrag benötigt entweder einen Task oder ein Projekt." };
  }
  if (hasProject && !hasTask && !allowProjectLevel) {
    return {
      valid: false,
      reason: "Zeitbuchung direkt auf Projektebene ist für diesen Tenant nicht aktiviert.",
    };
  }
  return { valid: true };
}
