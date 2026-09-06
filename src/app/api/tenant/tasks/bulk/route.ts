import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { resolveProjectIdsForTask } from "@/tenant/projectAccess/resolveProjectMembership";
import { hasAnyProjectMemberAccess } from "@/tenant/projectAccess/resolveProjectMembership";
import { addDays } from "@/tenant/projects/dateUtils";
import type { PrismaClient, User } from "@/generated/tenant-client/client.js";

export interface BulkPatchBody {
  taskIds: string[];
  statusId?: string;
  assigneeId?: string | null;
  dueDateShiftDays?: number;
}

export interface BulkDeleteBody {
  taskIds: string[];
}

/**
 * Core logic for bulk-updating tasks, factored out of the route handler so it can be
 * exercised directly in tests without going through Next.js request/header plumbing.
 * Per-task access is checked individually — a task in a project the caller can't access
 * is skipped, not treated as an error for the whole batch.
 */
export async function runBulkPatch(
  tenantDb: PrismaClient,
  user: User,
  body: BulkPatchBody,
): Promise<{ updated: string[]; skipped: string[] }> {
  const updated: string[] = [];
  const skipped: string[] = [];

  for (const taskId of body.taskIds) {
    const projectIds = await resolveProjectIdsForTask(tenantDb, taskId);
    const allowed = projectIds.length > 0 && (await hasAnyProjectMemberAccess(tenantDb, user, projectIds));
    if (!allowed) {
      skipped.push(taskId);
      continue;
    }

    if (typeof body.dueDateShiftDays === "number" && body.dueDateShiftDays !== 0) {
      const task = await tenantDb.task.findUnique({ where: { id: taskId }, select: { dueDate: true } });
      if (!task?.dueDate) {
        skipped.push(taskId);
        continue;
      }
      await tenantDb.task.update({
        where: { id: taskId },
        data: { dueDate: addDays(task.dueDate, body.dueDateShiftDays) },
      });
      updated.push(taskId);
      continue;
    }

    if (typeof body.statusId === "string" || body.assigneeId !== undefined) {
      await tenantDb.task.update({
        where: { id: taskId },
        data: {
          statusId: typeof body.statusId === "string" ? body.statusId : undefined,
          assigneeId: body.assigneeId === null ? null : body.assigneeId ?? undefined,
        },
      });
      updated.push(taskId);
      continue;
    }

    // Nothing to apply — access was fine but no field was requested for this task.
    skipped.push(taskId);
  }

  return { updated, skipped };
}

export async function runBulkDelete(
  tenantDb: PrismaClient,
  user: User,
  body: BulkDeleteBody,
): Promise<{ deleted: string[]; skipped: string[] }> {
  const deleted: string[] = [];
  const skipped: string[] = [];

  for (const taskId of body.taskIds) {
    const projectIds = await resolveProjectIdsForTask(tenantDb, taskId);
    const allowed = projectIds.length > 0 && (await hasAnyProjectMemberAccess(tenantDb, user, projectIds));
    if (!allowed) {
      skipped.push(taskId);
      continue;
    }

    try {
      // The task's own directly-owned join/child rows have no cascading delete
      // configured in the schema, so they'd otherwise block the delete with a FK
      // violation. Remaining references this task can't safely own itself (subtasks,
      // time entries, task dependencies) are left alone — if those exist, task.delete
      // below throws and the task is reported as skipped rather than silently orphaned.
      await tenantDb.$transaction([
        tenantDb.taskProject.deleteMany({ where: { taskId } }),
        tenantDb.taskTag.deleteMany({ where: { taskId } }),
        tenantDb.taskSubscriber.deleteMany({ where: { taskId } }),
        tenantDb.todo.deleteMany({ where: { taskId } }),
        tenantDb.customFieldValue.deleteMany({ where: { taskId } }),
        tenantDb.mention.deleteMany({ where: { comment: { taskId } } }),
        tenantDb.comment.deleteMany({ where: { taskId } }),
        tenantDb.attachment.deleteMany({ where: { taskId } }),
        tenantDb.task.delete({ where: { id: taskId } }),
      ]);
      deleted.push(taskId);
    } catch {
      skipped.push(taskId);
    }
  }

  return { deleted, skipped };
}

export async function PATCH(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.taskIds) || body.taskIds.length === 0) {
    return NextResponse.json({ error: "taskIds ist erforderlich." }, { status: 400 });
  }

  const result = await runBulkPatch(context.tenantDb, context.currentUser, {
    taskIds: body.taskIds,
    statusId: typeof body.statusId === "string" ? body.statusId : undefined,
    assigneeId: body.assigneeId === null ? null : typeof body.assigneeId === "string" ? body.assigneeId : undefined,
    dueDateShiftDays: typeof body.dueDateShiftDays === "number" ? body.dueDateShiftDays : undefined,
  });

  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.taskIds) || body.taskIds.length === 0) {
    return NextResponse.json({ error: "taskIds ist erforderlich." }, { status: 400 });
  }

  const result = await runBulkDelete(context.tenantDb, context.currentUser, { taskIds: body.taskIds });

  return NextResponse.json(result);
}
