import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { resolveProjectIdsForTask } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertAnyProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; todoId: string }> }) {
  const { id, todoId } = await params;
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

  const todo = await context.tenantDb.todo.update({
    where: { id: todoId },
    data: {
      title: typeof body.title === "string" ? body.title : undefined,
      isDone: typeof body.isDone === "boolean" ? body.isDone : undefined,
      assigneeId: body.assigneeId === null ? null : typeof body.assigneeId === "string" ? body.assigneeId : undefined,
    },
    include: { assignee: true },
  });
  return NextResponse.json({ todo });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; todoId: string }> }) {
  const { id, todoId } = await params;
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

  await context.tenantDb.todo.delete({ where: { id: todoId } });
  return NextResponse.json({ ok: true });
}
