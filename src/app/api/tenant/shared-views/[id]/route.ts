import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  const existing = await context.tenantDb.sharedView.findUnique({ where: { id }, select: { projectId: true } });
  if (!existing) {
    return NextResponse.json({ error: "Shared View nicht gefunden." }, { status: 404 });
  }
  const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, existing.projectId);
  if (denied) return denied;

  const view = await context.tenantDb.sharedView.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ view });
}
