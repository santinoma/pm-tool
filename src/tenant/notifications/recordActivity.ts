import type { ActivityEventType, PrismaClient, StatusCategory } from "../../generated/tenant-client/client.js";
import { shouldNotify, type PreferenceLevel } from "./fanout";
import { dispatchWebhooks } from "../webhooks/dispatch";
import { runAutomations, type AutomationEventType } from "../automations/runAutomations";

const AUTOMATION_EVENT_TYPES = new Set<string>(["task_created", "task_status_changed"]);

export interface RecordActivityInput {
  projectId: string;
  actorId: string;
  type: ActivityEventType;
  summary: string;
  mentionedUserIds?: string[];
  isBroadcast?: boolean;
  taskId?: string;
  statusCategory?: StatusCategory;
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

  if (input.taskId && AUTOMATION_EVENT_TYPES.has(input.type)) {
    await runAutomations(
      tenantDb,
      { type: input.type as AutomationEventType, taskId: input.taskId, statusCategory: input.statusCategory },
      activityEvent.id,
    );
  }
}
