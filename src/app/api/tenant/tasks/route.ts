import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { recordActivity } from "@/tenant/notifications/recordActivity";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { resolveInitialTriageState } from "@/tenant/projects/triageState";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { applyTaskTemplateContent, resolveTaskTemplate } from "@/tenant/tasks/taskTemplates";
import { nextAppendPosition } from "@/tenant/tasks/position";

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }
  const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, projectId);
  if (denied) return denied;

  const tasks = await context.tenantDb.task.findMany({
    where: { projects: { some: { projectId } } },
    include: { status: true, assignee: true },
    orderBy: { position: "asc" },
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.projectId !== "string") {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }
  const hasTemplateTaskId = typeof body.templateTaskId === "string";
  const hasExplicitTitle = typeof body.title === "string" && body.title.trim().length > 0;
  if (!hasExplicitTitle && !hasTemplateTaskId) {
    return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
  }
  const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, body.projectId);
  if (denied) return denied;

  let template: Awaited<ReturnType<typeof resolveTaskTemplate>> = null;
  if (hasTemplateTaskId) {
    template = await resolveTaskTemplate(context.tenantDb, body.templateTaskId, body.projectId);
    if (!template) {
      return NextResponse.json({ error: "Vorlage nicht gefunden." }, { status: 404 });
    }
  }

  const [requestedStatus, defaultStatus, settings] = await Promise.all([
    typeof body.statusId === "string"
      ? context.tenantDb.workflowStatus.findFirst({
          where: { id: body.statusId, workflow: { projects: { some: { id: body.projectId } } } },
        })
      : Promise.resolve(null),
    context.tenantDb.workflowStatus.findFirst({
      where: { workflow: { projects: { some: { id: body.projectId } } }, isDefault: true },
    }),
    getOrCreateTenantSettings(context.tenantDb),
  ]);
  const resolvedStatus = requestedStatus ?? defaultStatus;
  if (!resolvedStatus) {
    return NextResponse.json(
      { error: "Projekt hat keinen Default-Status. Kann keinen Task anlegen." },
      { status: 409 },
    );
  }

  const position = await nextAppendPosition(context.tenantDb, resolvedStatus.id);

  const task = await context.tenantDb.task.create({
    data: {
      title: hasExplicitTitle ? body.title : template!.title,
      description:
        typeof body.description === "string" ? body.description : (template?.description ?? null),
      statusId: resolvedStatus.id,
      position,
      assigneeId: typeof body.assigneeId === "string" ? body.assigneeId : null,
      startDate: typeof body.startDate === "string" ? new Date(body.startDate) : null,
      dueDate: typeof body.dueDate === "string" ? new Date(body.dueDate) : null,
      estimatedHours: typeof body.estimatedHours === "number" ? body.estimatedHours : null,
      parentTaskId: typeof body.parentTaskId === "string" ? body.parentTaskId : null,
      taskListGroupId: typeof body.taskListGroupId === "string" ? body.taskListGroupId : null,
      priority: typeof body.priority === "string" ? body.priority : "no_priority",
      tShirtSize: typeof body.tShirtSize === "string" ? body.tShirtSize : null,
      isKeyTask: typeof body.isKeyTask === "boolean" ? body.isKeyTask : false,
      isPrivate: typeof body.isPrivate === "boolean" ? body.isPrivate : false,
      isTemplate: typeof body.isTemplate === "boolean" ? body.isTemplate : false,
      inTriage: resolveInitialTriageState(settings.triageEnabled),
      projects: { create: { projectId: body.projectId, isPrimary: true } },
    },
    include: { status: true, projects: true },
  });

  if (template) {
    await applyTaskTemplateContent(context.tenantDb, {
      templateTaskId: template.id,
      newTaskId: task.id,
      projectId: body.projectId,
      defaultStatusId: resolvedStatus.id,
    });
  }

  await recordActivity(context.tenantDb, {
    projectId: body.projectId,
    actorId: context.currentUser.id,
    type: "task_created",
    summary: `Task „${task.title}“ wurde erstellt`,
    taskId: task.id,
  });

  return NextResponse.json({ task }, { status: 201 });
}
