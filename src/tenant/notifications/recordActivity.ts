import type { ActivityEventType, PrismaClient, StatusCategory } from "../../generated/tenant-client/client.js";
import { shouldNotify, type PreferenceLevel } from "./fanout";
import { dispatchWebhooks } from "../webhooks/dispatch";
import { runAutomations, type AutomationEventType } from "../automations/runAutomations";

/**
 * Nicht jeder ActivityEventType hat einen 1:1-benannten Automation-Trigger
 * (z. B. heißt der Kommentar-Trigger `task_commented`, das Activity-Event
 * aber `comment_added`) — diese Map löst die Zuordnung explizit auf, statt
 * per Cast zu hoffen, dass die Strings zufällig übereinstimmen.
 */
const AUTOMATION_EVENT_TYPE_MAP: Partial<Record<ActivityEventType, AutomationEventType>> = {
  task_created: "task_created",
  task_status_changed: "task_status_changed",
  task_updated: "task_updated",
  comment_added: "task_commented",
};

export interface RecordActivityInput {
  projectId: string;
  actorId: string;
  type: ActivityEventType;
  summary: string;
  mentionedUserIds?: string[];
  isBroadcast?: boolean;
  taskId?: string;
  statusCategory?: StatusCategory;
  budgetId?: string;
}

export async function recordActivity(
  tenantDb: PrismaClient,
  input: RecordActivityInput,
): Promise<void> {
  const mentionedUserIds = new Set(input.mentionedUserIds ?? []);
  const isBroadcast = input.isBroadcast ?? false;

  const activityEvent = await tenantDb.activityEvent.create({
    data: {
      projectId: input.projectId,
      actorId: input.actorId,
      type: input.type,
      summary: input.summary,
      taskId: input.taskId,
      budgetId: input.budgetId,
    },
  });

  const [users, preferences] = await Promise.all([
    tenantDb.user.findMany({ select: { id: true } }),
    tenantDb.notificationPreference.findMany({
      where: { projectId: input.projectId },
      select: { userId: true, level: true },
    }),
  ]);

  const preferenceByUserId = new Map<string, PreferenceLevel>(
    preferences.map((pref) => [pref.userId, pref.level]),
  );

  const notificationsToCreate = users
    .filter((user) => {
      const level = preferenceByUserId.get(user.id) ?? "all";
      return shouldNotify(
        level,
        user.id === input.actorId,
        mentionedUserIds.has(user.id),
        isBroadcast,
      );
    })
    .map((user) => ({ userId: user.id, activityEventId: activityEvent.id }));

  if (notificationsToCreate.length > 0) {
    await tenantDb.notification.createMany({ data: notificationsToCreate });
  }

  await dispatchWebhooks(tenantDb, {
    id: activityEvent.id,
    type: activityEvent.type,
    summary: activityEvent.summary,
    projectId: activityEvent.projectId,
    actorId: activityEvent.actorId,
    createdAt: activityEvent.createdAt,
  });

  const automationEventType = AUTOMATION_EVENT_TYPE_MAP[input.type];
  if (input.taskId && automationEventType) {
    await runAutomations(
      tenantDb,
      { type: automationEventType, taskId: input.taskId, statusCategory: input.statusCategory },
      activityEvent.id,
      input.actorId,
    );
  }
}
