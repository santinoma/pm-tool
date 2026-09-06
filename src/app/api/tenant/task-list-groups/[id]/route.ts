import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { resolveProjectIdForTaskListGroup } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const denied = await assertSingleProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdForTaskListGroup(context.tenantDb, id),
  );
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const list = await context.tenantDb.taskListGroup.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      position: typeof body.position === "number" ? body.position : undefined,
    },
  });

  return NextResponse.json({ list });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const denied = await assertSingleProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdForTaskListGroup(context.tenantDb, id),
  );
  if (denied) return denied;

  // Deleting a list must not delete its tasks — just unassign them so they
  // fall back to "no list" (mirrors folder-delete's rejection-based safety,
  // but here nulling is safe since it only affects this one list's tasks).
  await context.tenantDb.task.updateMany({ where: { taskListGroupId: id }, data: { taskListGroupId: null } });
  await context.tenantDb.taskListGroup.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
