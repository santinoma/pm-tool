import type {
  AutomationActionType,
  PrismaClient,
  StatusCategory,
} from "@/generated/tenant-client/client.js";

export type AutomationEventType =
  | "task_created"
  | "task_status_changed"
  | "task_updated"
  | "task_commented"
  | "time_daily"
  | "time_weekly";

export interface AutomationEvent {
  type: AutomationEventType;
  taskId: string;
  statusCategory?: StatusCategory;
  /** Primäres Projekt des betroffenen Tasks — wird für den `projectIds`-Scope
   * einer Regel benötigt. Optional, damit reine Unit-Tests (ohne DB) weiterhin
   * ohne Projektauflösung funktionieren; wird dann wie "kein Projekt bekannt"
   * behandelt (projektspezifische Regeln matchen dann nicht). */
  projectId?: string | null;
}

/**
 * `type` wird direkt vom generierten Prisma-Enum abgeleitet, statt als
 * handgeschriebene Literal-Union gepflegt zu werden — eine künftige
 * Erweiterung von `AutomationActionType` im Schema bricht dadurch nicht
 * erneut den Build hier.
 */
export interface AutomationActionInput {
  type: AutomationActionType;
  targetUserId: string | null;
  targetStatusId: string | null;
  commentBody: string | null;
  newItemTitle?: string | null;
}

export interface AutomationRuleInput {
  id: string;
  triggers: AutomationEventType[];
  conditionStatusCategory: StatusCategory | null;
  isEnabled: boolean;
  actions: AutomationActionInput[];
  /** Leer = gilt für alle Projekte (Legacy-/Default-Verhalten). Nicht-leer =
   * nur für Events aus einem dieser Projekte. */
  projectIds?: string[];
}

export function selectMatchingRules(
  rules: AutomationRuleInput[],
  event: AutomationEvent,
): AutomationRuleInput[] {
  return rules.filter((rule) => {
    if (!rule.isEnabled || !rule.triggers.includes(event.type)) {
      return false;
    }
    if (event.type === "task_status_changed" && rule.conditionStatusCategory) {
      if (rule.conditionStatusCategory !== event.statusCategory) {
        return false;
      }
    }
    const projectIds = rule.projectIds ?? [];
    if (projectIds.length > 0) {
      if (!event.projectId || !projectIds.includes(event.projectId)) {
        return false;
      }
    }
    return true;
  });
}

/** Führt die Aktionen EINER Regel gegen einen Task aus — wiederverwendet von
 * `runAutomations` (automatisch, alle passenden Regeln), vom manuellen
 * "Run Now"-Endpunkt (genau eine Regel, gezielt ausgewählt) und vom
 * zeitgesteuerten Bulk-Lauf (`runDueTimeAutomationRules`, je Treffer-Task). */
export async function executeRuleActions(
  tenantDb: PrismaClient,
  actions: AutomationActionInput[],
  taskId: string,
  activityEventId: string,
  actorId: string,
): Promise<void> {
  // Lazy aufgelöst und zwischengespeichert, da mehrere Aktionen derselben
  // Regel (create_task/create_subtask) dasselbe Primärprojekt brauchen.
  let primaryProjectId: string | null | undefined;
  async function resolvePrimaryProjectId(): Promise<string | null> {
    if (primaryProjectId === undefined) {
      const link = await tenantDb.taskProject.findFirst({
        where: { taskId, isPrimary: true },
        select: { projectId: true },
      });
      primaryProjectId = link?.projectId ?? null;
    }
    return primaryProjectId;
  }

  for (const action of actions) {
    if (action.type === "assign_user" && action.targetUserId) {
      await tenantDb.task.update({
        where: { id: taskId },
        data: { assigneeId: action.targetUserId },
      });
    } else if (action.type === "notify_user" && action.targetUserId) {
      await tenantDb.notification.create({
        data: { userId: action.targetUserId, activityEventId },
      });
    } else if (action.type === "change_status" && action.targetStatusId) {
      await tenantDb.task.update({
        where: { id: taskId },
        data: { statusId: action.targetStatusId },
      });
    } else if (action.type === "add_comment" && action.commentBody) {
      await tenantDb.comment.create({
        data: { taskId, authorId: actorId, body: action.commentBody },
      });
    } else if (action.type === "create_task" || action.type === "create_subtask") {
      const projectId = await resolvePrimaryProjectId();
      if (projectId) {
        // Default-Status zuerst, sonst der erste Status nach Position — es
        // muss immer irgendein Status auf dem Task landen.
        const status = await tenantDb.workflowStatus.findFirst({
          where: { workflow: { projects: { some: { id: projectId } } } },
          orderBy: [{ isDefault: "desc" }, { position: "asc" }],
        });
        if (status) {
          await tenantDb.task.create({
            data: {
              title: action.newItemTitle ?? "Automatisierter Task",
              statusId: status.id,
              assigneeId: action.targetUserId,
              parentTaskId: action.type === "create_subtask" ? taskId : undefined,
              projects: { create: { projectId, isPrimary: true } },
            },
          });
        }
      }
    } else if (action.type === "create_todo") {
      await tenantDb.todo.create({
        data: {
          taskId,
          title: action.newItemTitle ?? "Automatisierter Todo",
          assigneeId: action.targetUserId,
        },
      });
    } else if (action.type === "send_email") {
      // Diese Codebase hat keine echte E-Mail-Versandinfrastruktur (kein
      // nodemailer/resend/sendgrid, kein tenant/email-Modul). Statt neue
      // Infrastruktur zu erfinden, bleibt diese Aktion bewusst ein
      // dokumentiertes No-Op, bis echte E-Mail-Infra existiert.
      console.warn(
        `[automations] send_email ist nicht konfiguriert — Aktion für Task ${taskId} übersprungen.`,
      );
    }
  }
}

export async function runAutomations(
  tenantDb: PrismaClient,
  event: AutomationEvent,
  activityEventId: string,
  actorId: string,
): Promise<void> {
  const rules = await tenantDb.automationRule.findMany({
    where: { isEnabled: true, triggers: { has: event.type } },
    include: { actions: { orderBy: { position: "asc" } } },
  });

  let projectId = event.projectId;
  if (projectId === undefined) {
    const primaryLink = await tenantDb.taskProject.findFirst({
      where: { taskId: event.taskId, isPrimary: true },
      select: { projectId: true },
    });
    projectId = primaryLink?.projectId ?? null;
  }

  const matching = selectMatchingRules(rules, { ...event, projectId });

  for (const rule of matching) {
    await executeRuleActions(tenantDb, rule.actions, event.taskId, activityEventId, actorId);
  }
}
