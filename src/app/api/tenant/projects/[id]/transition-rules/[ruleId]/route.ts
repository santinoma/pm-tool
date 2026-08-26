import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; ruleId: string }> }) {
  const { id, ruleId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManageWorkflows = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "workflows_manage",
    id,
  );
  if (!canManageWorkflows) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  await context.tenantDb.transitionRule.delete({ where: { id: ruleId } });
  return NextResponse.json({ success: true });
}
