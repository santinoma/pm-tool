import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { recordActivity } from "@/tenant/notifications/recordActivity";
import {
  collectRequiredFieldKeys,
  findMissingRequiredFields,
  type TaskFieldState,
} from "@/tenant/workflow/transitionValidation";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const task = await context.tenantDb.task.findUnique({
    where: { id },
    include: {
      status: true,
      assignee: true,
      projects: { include: { project: true } },
      blocking: { include: { blockedTask: true } },
      blockedBy: { include: { blockingTask: true } },
      customValues: { include: { field: true } },
    },
  });
  if (!task) {
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
            customValues: { select: { fieldId: true, value: true } },
            projects: { where: { isPrimary: true }, select: { projectId: true } },
          },
        })
      : null;

  const effectiveCycleId: string | null | undefined = body.cycleId === null ? null : body.cycleId ?? undefined;
  const cycleActuallyChanged = cycleChanging && previousTask?.cycleId !== effectiveCycleId;

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
      cycleId: effectiveCycleId,
      cycleAssignedAt: cycleActuallyChanged ? (effectiveCycleId === null ? null : new Date()) : undefined,
    },
    include: { status: true },
  });

  if (previousTask && previousTask.statusId !== task.statusId) {
    const primaryProjectId = previousTask.projects[0]?.projectId;
    if (primaryProjectId) {
      await recordActivity(context.tenantDb, {
        projectId: primaryProjectId,
        actorId: context.currentUser.id,
        type: "task_status_changed",
        summary: `Status von „${task.title}“ geändert zu „${task.status.name}“`,
        taskId: task.id,
        statusCategory: task.status.category,
      });
    }
  }

  return NextResponse.json({ task });
}
