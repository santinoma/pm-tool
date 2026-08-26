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
