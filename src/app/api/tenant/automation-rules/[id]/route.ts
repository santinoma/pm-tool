import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManageAutomations = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "automations_manage",
  );
  if (!canManageAutomations) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.isEnabled !== "boolean") {
    return NextResponse.json({ error: "isEnabled (boolean) ist erforderlich." }, { status: 400 });
  }

  const rule = await context.tenantDb.automationRule.update({
    where: { id },
    data: { isEnabled: body.isEnabled },
  });
  return NextResponse.json({ rule });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManageAutomations = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "automations_manage",
  );
  if (!canManageAutomations) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  await context.tenantDb.automationAction.deleteMany({ where: { ruleId: id } });
  await context.tenantDb.automationRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
