import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { resolveLinkedTasks } from "@/tenant/taskLinks/taskLinkView";
import { resolveProjectIdsForTask } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertAnyProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const links = await context.tenantDb.taskLink.findMany({
    where: { OR: [{ sourceTaskId: id }, { targetTaskId: id }] },
  });
  const resolved = resolveLinkedTasks(links, id);

  const tasks = await context.tenantDb.task.findMany({
    where: { id: { in: resolved.map((entry) => entry.taskId) } },
    include: { status: true, assignee: true, projects: { where: { isPrimary: true }, include: { project: true } } },
  });
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const linkedTasks = resolved
    .map((entry) => {
      const task = taskById.get(entry.taskId);
      if (!task) return null;
      return {
        linkId: entry.linkId,
        taskId: task.id,
        title: task.title,
        statusName: task.status.name,
        statusCategory: task.status.category,
        assigneeLabel: task.assignee?.name ?? task.assignee?.email ?? null,
        projectName: task.projects[0]?.project.name ?? "—",
      };
    })
    .filter((entry) => entry !== null);

  return NextResponse.json({ links: linkedTasks });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (!body || typeof body.targetTaskId !== "string") {
    return NextResponse.json({ error: "targetTaskId ist erforderlich." }, { status: 400 });
  }
  if (body.targetTaskId === id) {
    return NextResponse.json({ error: "Ein Task kann nicht mit sich selbst verlinkt werden." }, { status: 400 });
  }

  const existing = await context.tenantDb.taskLink.findFirst({
    where: {
      OR: [
        { sourceTaskId: id, targetTaskId: body.targetTaskId },
        { sourceTaskId: body.targetTaskId, targetTaskId: id },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Diese Verknüpfung existiert bereits." }, { status: 409 });
  }

  const link = await context.tenantDb.taskLink.create({
    data: { sourceTaskId: id, targetTaskId: body.targetTaskId, createdById: context.currentUser.id },
  });
  return NextResponse.json({ link }, { status: 201 });
}
