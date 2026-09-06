import type { PrismaClient } from "@/generated/tenant-client/client.js";
import { getUtcDateKey } from "../projects/dateUtils";
import { getCurrentWeekRange } from "../resourcePlanning/week";
import { executeRuleActions } from "./runAutomations";

export type ScheduleRecurrence = "time_daily" | "time_weekly";

/**
 * Obergrenze für Tasks, die pro fälliger zeitbasierter Regel und Lauf
 * bearbeitet werden ("Find Object"-Massenausführung). Verhindert eine
 * unbeschränkte Ausführung über tausende Tasks hinweg bei einem einzigen
 * Seitenaufruf. Bei mehr Treffern werden die ersten `MAX_BULK_AUTOMATION_TASKS`
 * nach `createdAt` (stabile Reihenfolge) verarbeitet; der Rest läuft erst im
 * nächsten fälligen Zeitfenster (nächster Tag/Woche), da `lastRunPeriodKey`
 * dann bereits aktualisiert ist — echte "restliche Treffer sofort nachholen"-
 * Logik ist bewusst außerhalb dieses Scopes.
 */
export const MAX_BULK_AUTOMATION_TASKS = 200;

/**
 * Stabiler Periodenschlüssel für zeitbasierte Automations-Trigger — exakt
 * dasselbe Muster wie bei den automatischen Check-ins (`computePeriodKey`):
 * `time_daily` → Tagesstring, `time_weekly` → UTC-Montag-Datumsstring der Woche.
 */
export function computeAutomationPeriodKey(date: Date, recurrence: ScheduleRecurrence): string {
  if (recurrence === "time_daily") {
    return getUtcDateKey(date);
  }
  const { start } = getCurrentWeekRange(date);
  return getUtcDateKey(start);
}

/**
 * Eine zeitbasierte Regel ist fällig, wenn die aktuelle Periode noch nicht
 * gelaufen ist (`lastRunPeriodKey` weicht ab) UND die konfigurierte Uhrzeit
 * bereits erreicht ist. Pull-basiert (kein echter Cron) — ausgewertet, wenn
 * ein Nutzer eine Seite besucht, die den Check auslöst (z. B. Automations-
 * Einstellungen), oder manuell über "Jetzt ausführen".
 */
export function isTimeAutomationDue(
  now: Date,
  recurrence: ScheduleRecurrence,
  scheduleTime: string | null,
  scheduleWeekday: number | null,
  lastRunPeriodKey: string | null,
): boolean {
  const currentPeriodKey = computeAutomationPeriodKey(now, recurrence);
  if (currentPeriodKey === lastRunPeriodKey) {
    return false;
  }
  if (recurrence === "time_weekly" && scheduleWeekday !== null && now.getUTCDay() !== scheduleWeekday) {
    return false;
  }
  if (scheduleTime) {
    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledMinutes = hours * 60 + minutes;
    const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    if (nowMinutes < scheduledMinutes) {
      return false;
    }
  }
  return true;
}

/**
 * "Find Object"-Massenausführung für fällige zeitbasierte Regeln (Productives
 * "Check if"-Schritt): findet ALLE Tasks, die zu `conditionStatusCategory`
 * und dem `projectIds`-Scope der Regel passen (leer = alle Projekte), und
 * führt die Regel-Aktionen gegen jeden einzelnen Treffer aus — begrenzt auf
 * `maxTasksPerRule` (Standard `MAX_BULK_AUTOMATION_TASKS`) Tasks je Regel und
 * Lauf, stabil sortiert nach `createdAt`. Pull-basiert: wird von einem echten
 * Request-Pfad aus aufgerufen (Automations-Einstellungsseite, siehe
 * `page.tsx`), nicht von einem separaten Cron.
 *
 * Ersetzt den bisherigen Zustand, in dem `time_daily`/`time_weekly`-Regeln
 * nur über den manuellen "Run Now"-Endpunkt gegen genau einen explizit
 * gewählten Task liefen — dies war eine dokumentierte Lücke ("keine echte
 * unbeaufsichtigte Massenausführung").
 */
export async function runDueTimeAutomationRules(
  tenantDb: PrismaClient,
  now: Date,
  actorId: string,
  maxTasksPerRule: number = MAX_BULK_AUTOMATION_TASKS,
): Promise<void> {
  const candidateRules = await tenantDb.automationRule.findMany({
    where: {
      isEnabled: true,
      OR: [{ triggers: { has: "time_daily" } }, { triggers: { has: "time_weekly" } }],
    },
    include: { actions: { orderBy: { position: "asc" } } },
  });

  for (const rule of candidateRules) {
    const recurrence: ScheduleRecurrence | null = rule.triggers.includes("time_daily")
      ? "time_daily"
      : rule.triggers.includes("time_weekly")
        ? "time_weekly"
        : null;
    if (!recurrence) continue;

    const due = isTimeAutomationDue(
      now,
      recurrence,
      rule.scheduleTime,
      rule.scheduleWeekday,
      rule.lastRunPeriodKey,
    );
    if (!due) continue;

    const tasks = await tenantDb.task.findMany({
      where: {
        ...(rule.conditionStatusCategory ? { status: { category: rule.conditionStatusCategory } } : {}),
        ...(rule.projectIds.length > 0
          ? { projects: { some: { projectId: { in: rule.projectIds } } } }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      take: maxTasksPerRule,
      select: { id: true },
    });

    if (tasks.length > 0) {
      const primaryLinks = await tenantDb.taskProject.findMany({
        where: { taskId: { in: tasks.map((task) => task.id) }, isPrimary: true },
        select: { taskId: true, projectId: true },
      });
      const projectIdByTaskId = new Map(primaryLinks.map((link) => [link.taskId, link.projectId]));

      for (const task of tasks) {
        const projectId = projectIdByTaskId.get(task.id);
        if (!projectId) continue; // Task ohne Primärprojekt kann keine ActivityEvent führen — überspringen.

        const activityEvent = await tenantDb.activityEvent.create({
          data: {
            projectId,
            actorId,
            type: "task_updated",
            summary: `Automation „${rule.name}“ zeitgesteuert (Massenausführung) ausgeführt`,
          },
        });

        await executeRuleActions(tenantDb, rule.actions, task.id, activityEvent.id, actorId);
      }
    }

    await tenantDb.automationRule.update({
      where: { id: rule.id },
      data: { lastRunPeriodKey: computeAutomationPeriodKey(now, recurrence) },
    });
  }
}
