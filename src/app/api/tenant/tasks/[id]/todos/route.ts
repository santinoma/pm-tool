import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
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

  const todos = await context.tenantDb.todo.findMany({
    where: { taskId: id },
    include: { assignee: true },
    orderBy: { position: "asc" },
  });
  return NextResponse.json({ todos });
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
  if (!body || typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "title ist erforderlich." }, { status: 400 });
  }

  const count = await context.tenantDb.todo.count({ where: { taskId: id } });
  const todo = await context.tenantDb.todo.create({
    data: {
      taskId: id,
      title: body.title,
      assigneeId: typeof body.assigneeId === "string" ? body.assigneeId : null,
      position: count,
    },
    include: { assignee: true },
  });
  return NextResponse.json({ todo }, { status: 201 });
}
