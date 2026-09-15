import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { recordActivity } from "@/tenant/notifications/recordActivity";
import { resolveProjectIdsForTask } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertAnyProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { canViewPrivateTask } from "@/tenant/projectAccess/privateTaskFilter";
import {
  collectRequiredFieldKeys,
  findMissingRequiredFields,
  type TaskFieldState,
} from "@/tenant/workflow/transitionValidation";
import { computeNextDueDate, type RecurrenceConfig } from "@/tenant/recurrence/computeNextOccurrence";
import { nextAppendPosition } from "@/tenant/tasks/position";
import type { PrismaClient } from "@/generated/tenant-client/client.js";

const RECURRENCE_FREQUENCIES = new Set(["daily", "weekly", "monthly", "yearly"]);

function parseRecurrenceConfig(value: unknown): RecurrenceConfig | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { frequency?: unknown; interval?: unknown };
  if (typeof candidate.frequency !== "string" || !RECURRENCE_FREQUENCIES.has(candidate.frequency)) return null;
  const interval = typeof candidate.interval === "number" && candidate.interval > 0 ? candidate.interval : 1;
  return { frequency: candidate.frequency as RecurrenceConfig["frequency"], interval };
}

/**
 * Legt beim Abschluss eines wiederkehrenden Tasks die nächste Instanz an: gleicher Titel/
 * Beschreibung/Schätzung/Assignee, verkettet über recurrenceParentId auf den ursprünglichen
 * Template-Task, mit dem projekteigenen Default-Status und dem berechneten Folgetermin.
 * Kopiert Subtasks/Todos nur mit Titel (frischer Zustand), analog zu Task-Templates.
 * Wird bewusst mit try/catch aufgerufen: ein Fehler hier darf die Status-Änderung selbst
 * nicht scheitern lassen.
 */
async function createNextRecurringInstance(
  tenantDb: PrismaClient,
  completedTask: {
    id: string;
    title: string;
    description: string | null;
    estimatedHours: number | null;
    assigneeId: string | null;
    recurrence: unknown;
    recurrenceParentId: string | null;
    dueDate: Date | null;
  },
  projectId: string,
): Promise<void> {
  const recurrence = parseRecurrenceConfig(completedTask.recurrence);
  if (!recurrence || !completedTask.dueDate) return;

  const nextDueDate = computeNextDueDate(completedTask.dueDate, recurrence);
  const rootTaskId = completedTask.recurrenceParentId ?? completedTask.id;

  const [defaultStatus, subtasks, todos] = await Promise.all([
    tenantDb.workflowStatus.findFirst({ where: { projectId, isDefault: true } }),
    tenantDb.task.findMany({ where: { parentTaskId: completedTask.id }, select: { title: true } }),
    tenantDb.todo.findMany({ where: { taskId: completedTask.id }, select: { title: true } }),
  ]);
  if (!defaultStatus) return;

  const nextInstance = await tenantDb.task.create({
    data: {
      title: completedTask.title,
      description: completedTask.description,
      estimatedHours: completedTask.estimatedHours,
      assigneeId: completedTask.assigneeId,
      statusId: defaultStatus.id,
      dueDate: nextDueDate,
      startDate: null,
      recurrence: { frequency: recurrence.frequency, interval: recurrence.interval },
      recurrenceParentId: rootTaskId,
      projects: { create: { projectId, isPrimary: true } },
    },
  });

  await Promise.all([
    ...subtasks.map((sub) =>
      tenantDb.task.create({
        data: {
          title: sub.title,
          statusId: defaultStatus.id,
          parentTaskId: nextInstance.id,
          projects: { create: { projectId, isPrimary: true } },
        },
      }),
    ),
    ...todos.map((todo) =>
      tenantDb.todo.create({
        data: { taskId: nextInstance.id, title: todo.title },
      }),
    ),
  ]);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const currentUser = context.currentUser;
  const denied = await assertAnyProjectAccess(
    context.tenantDb,
    currentUser,
    await resolveProjectIdsForTask(context.tenantDb, id),
  );
  if (denied) return denied;

  const task = await context.tenantDb.task.findUnique({
    where: { id },
    include: {
      status: true,
      assignee: true,
      projects: { include: { project: true } },
      blocking: { include: { blockedTask: true } },
      blockedBy: { include: { blockingTask: true } },
      customValues: { include: { field: true } },
      subscribers: { select: { userId: true } },
    },
  });
  if (!task) {
    return NextResponse.json({ error: "Task nicht gefunden." }, { status: 404 });
  }
  const isSubscriber = task.subscribers.some((s) => s.userId === currentUser.id);
  if (!canViewPrivateTask(currentUser, task, isSubscriber)) {
    return NextResponse.json({ error: "Task nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ task });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const denied = await assertAnyProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdsForTask(context.tenantDb, id),
  );
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const statusChanging = typeof body.statusId === "string";
  const cycleChanging = body.cycleId !== undefined;
  const previousTask =
    statusChanging || cycleChanging
      ? await context.tenantDb.task.findUnique({
          where: { id },
          select: {
            statusId: true,
            assigneeId: true,
            dueDate: true,
            estimatedHours: true,
            cycleId: true,
            title: true,
            description: true,
            recurrence: true,
            recurrenceParentId: true,
            customValues: { select: { fieldId: true, value: true } },
            projects: { where: { isPrimary: true }, select: { projectId: true } },
          },
        })
      : null;

  const effectiveCycleId: string | null | undefined = body.cycleId === null ? null : body.cycleId ?? undefined;
  const cycleActuallyChanged = cycleChanging && previousTask?.cycleId !== effectiveCycleId;

  // Reference "prioritize tasks inside a task list": an explicit `position` (fractional
  // drop-between-neighbors value) wins; a bare status change with no position appends
  // the task to the end of the destination column, matching a drop with no reorder.
  let resolvedPosition: number | undefined;
  if (typeof body.position === "number") {
    resolvedPosition = body.position;
  } else if (statusChanging && previousTask && previousTask.statusId !== body.statusId) {
    resolvedPosition = await nextAppendPosition(context.tenantDb, body.statusId);
  }

  if (previousTask && previousTask.statusId !== body.statusId) {
    const primaryProjectId = previousTask.projects[0]?.projectId;
    if (primaryProjectId) {
      const [rules, customFields] = await Promise.all([
        context.tenantDb.transitionRule.findMany({
          where: { projectId: primaryProjectId },
          select: { fromStatusId: true, toStatusId: true, requiredFieldKeys: true },
        }),
        context.tenantDb.customFieldDef.findMany({
          where: { projectId: primaryProjectId },
          select: { id: true, label: true },
        }),
      ]);

      const requiredKeys = collectRequiredFieldKeys(rules, previousTask.statusId, body.statusId);
      if (requiredKeys.size > 0) {
        const effectiveAssigneeId = body.assigneeId !== undefined ? body.assigneeId : previousTask.assigneeId;
        const effectiveDueDate = body.dueDate !== undefined ? body.dueDate : previousTask.dueDate;
        const effectiveEstimatedHours =
          body.estimatedHours !== undefined ? body.estimatedHours : previousTask.estimatedHours;

        const state: TaskFieldState = {
          assignee: Boolean(effectiveAssigneeId),
          dueDate: Boolean(effectiveDueDate),
          estimatedHours: effectiveEstimatedHours !== null && effectiveEstimatedHours !== undefined,
          filledCustomFieldIds: new Set(
            previousTask.customValues.filter((value) => value.value.trim().length > 0).map((value) => value.fieldId),
          ),
        };
        const customFieldLabels = Object.fromEntries(customFields.map((field) => [field.id, field.label]));
        const missing = findMissingRequiredFields(requiredKeys, state, customFieldLabels);
        if (missing.length > 0) {
          return NextResponse.json(
            { error: `Pflichtfelder für diesen Übergang fehlen: ${missing.join(", ")}` },
            { status: 400 },
          );
        }
      }
    }
  }

  const task = await context.tenantDb.task.update({
    where: { id },
    data: {
      title: typeof body.title === "string" ? body.title : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      statusId: typeof body.statusId === "string" ? body.statusId : undefined,
      position: resolvedPosition,
      assigneeId: body.assigneeId === null ? null : body.assigneeId ?? undefined,
      startDate: body.startDate ? new Date(body.startDate) : body.startDate === null ? null : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate === null ? null : undefined,
      estimatedHours:
        typeof body.estimatedHours === "number"
          ? body.estimatedHours
          : body.estimatedHours === null
            ? null
            : undefined,
      hillPosition:
        typeof body.hillPosition === "number"
          ? body.hillPosition
          : body.hillPosition === null
            ? null
            : undefined,
      inTriage: typeof body.inTriage === "boolean" ? body.inTriage : undefined,
      isKeyTask: typeof body.isKeyTask === "boolean" ? body.isKeyTask : undefined,
      isPrivate: typeof body.isPrivate === "boolean" ? body.isPrivate : undefined,
      isTemplate: typeof body.isTemplate === "boolean" ? body.isTemplate : undefined,
      cycleId: effectiveCycleId,
      cycleAssignedAt: cycleActuallyChanged ? (effectiveCycleId === null ? null : new Date()) : undefined,
      taskListGroupId: body.taskListGroupId === null ? null : body.taskListGroupId ?? undefined,
      recurrence: body.recurrence === null ? null : body.recurrence !== undefined ? body.recurrence : undefined,
    },
    include: { status: true },
  });

  const statusActuallyChanged = Boolean(previousTask) && previousTask!.statusId !== task.statusId;
  if (statusActuallyChanged) {
    const primaryProjectId = previousTask!.projects[0]?.projectId;
    if (primaryProjectId) {
      await recordActivity(context.tenantDb, {
        projectId: primaryProjectId,
        actorId: context.currentUser.id,
        type: "task_status_changed",
        summary: `Status von „${task.title}“ geändert zu „${task.status.name}“`,
        taskId: task.id,
        statusCategory: task.status.category,
      });

      if (task.status.category === "done") {
        try {
          await createNextRecurringInstance(
            context.tenantDb,
            {
              id: task.id,
              title: task.title,
              description: task.description,
              estimatedHours: task.estimatedHours,
              assigneeId: task.assigneeId,
              recurrence: task.recurrence,
              recurrenceParentId: task.recurrenceParentId,
              dueDate: task.dueDate,
            },
            primaryProjectId,
          );
        } catch (error) {
          console.error("Konnte nächste Instanz des wiederkehrenden Tasks nicht anlegen", error);
        }
      }
    }
  } else {
    const otherFieldsPatched = ["title", "description", "assigneeId", "startDate", "dueDate", "estimatedHours"].some(
      (key) => body[key] !== undefined,
    );
    if (otherFieldsPatched) {
      const primaryLink = await context.tenantDb.taskProject.findFirst({
        where: { taskId: id, isPrimary: true },
        select: { projectId: true },
      });
      if (primaryLink) {
        await recordActivity(context.tenantDb, {
          projectId: primaryLink.projectId,
          actorId: context.currentUser.id,
          type: "task_updated",
          summary: `Task „${task.title}“ wurde bearbeitet`,
          taskId: task.id,
        });
      }
    }
  }

  return NextResponse.json({ task });
}
