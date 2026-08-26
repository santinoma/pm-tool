import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { recordActivity } from "@/tenant/notifications/recordActivity";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { resolveInitialTriageState } from "@/tenant/projects/triageState";

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }

  const tasks = await context.tenantDb.task.findMany({
    where: { projects: { some: { projectId } } },
    include: { status: true, assignee: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
  }
  if (typeof body.projectId !== "string") {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }

  const [defaultStatus, settings] = await Promise.all([
    context.tenantDb.workflowStatus.findFirst({
      where: { projectId: body.projectId, isDefault: true },
    }),
    getOrCreateTenantSettings(context.tenantDb),
  ]);
  if (!defaultStatus) {
    return NextResponse.json(
      { error: "Projekt hat keinen Default-Status. Kann keinen Task anlegen." },
      { status: 409 },
    );
  }

  const task = await context.tenantDb.task.create({
    data: {
      title: body.title,
      description: typeof body.description === "string" ? body.description : null,
      statusId: defaultStatus.id,
      assigneeId: typeof body.assigneeId === "string" ? body.assigneeId : null,
      inTriage: resolveInitialTriageState(settings.triageEnabled),
      projects: { create: { projectId: body.projectId, isPrimary: true } },
    },
    include: { status: true, projects: true },
  });

  await recordActivity(context.tenantDb, {
    projectId: body.projectId,
    actorId: context.currentUser.id,
    type: "task_created",
    summary: `Task „${task.title}“ wurde erstellt`,
    taskId: task.id,
  });

  return NextResponse.json({ task }, { status: 201 });
}
