import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { resolveProjectIdsForTask } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertAnyProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; tagId: string }> }) {
  const { id, tagId } = await params;
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

  await context.tenantDb.taskTag.delete({ where: { taskId_tagId: { taskId: id, tagId } } });
  return NextResponse.json({ ok: true });
}
