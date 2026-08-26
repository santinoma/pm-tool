import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; overrideId: string }> }) {
  const { overrideId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  await context.tenantDb.projectRoleOverride.delete({ where: { id: overrideId } });
  return NextResponse.json({ ok: true });
}
