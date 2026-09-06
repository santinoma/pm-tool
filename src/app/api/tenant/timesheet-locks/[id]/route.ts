import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const existing = await context.tenantDb.timesheetLock.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Sperre nicht gefunden." }, { status: 404 });
  }

  await context.tenantDb.timesheetLock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
