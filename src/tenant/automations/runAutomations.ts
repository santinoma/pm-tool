import type { PrismaClient, StatusCategory } from "@/generated/tenant-client/client.js";

export type AutomationEventType = "task_created" | "task_status_changed";

export interface AutomationEvent {
  type: AutomationEventType;
  taskId: string;
  statusCategory?: StatusCategory;
}

export interface AutomationActionInput {
  type: "assign_user" | "notify_user";
  targetUserId: string;
}

export interface AutomationRuleInput {
  id: string;
  trigger: AutomationEventType;
  conditionStatusCategory: StatusCategory | null;
  isEnabled: boolean;
  actions: AutomationActionInput[];
}

export function selectMatchingRules(
  rules: AutomationRuleInput[],
  event: AutomationEvent,
): AutomationRuleInput[] {
  return rules.filter((rule) => {
    if (!rule.isEnabled || rule.trigger !== event.type) {
      return false;
    }
    if (rule.trigger === "task_status_changed" && rule.conditionStatusCategory) {
      return rule.conditionStatusCategory === event.statusCategory;
    }
    return true;
  });
}

export async function runAutomations(
  tenantDb: PrismaClient,
  event: AutomationEvent,
  activityEventId: string,
): Promise<void> {
  const rules = await tenantDb.automationRule.findMany({
    where: { isEnabled: true, trigger: event.type },
    include: { actions: { orderBy: { position: "asc" } } },
  });

  const matching = selectMatchingRules(rules, event);

  for (const rule of matching) {
    for (const action of rule.actions) {
      if (action.type === "assign_user") {
        await tenantDb.task.update({
          where: { id: event.taskId },
          data: { assigneeId: action.targetUserId },
        });
      } else if (action.type === "notify_user") {
        await tenantDb.notification.create({
          data: { userId: action.targetUserId, activityEventId },
        });
      }
    }
  }
}
