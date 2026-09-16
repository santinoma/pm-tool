import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const OPTIONS_REQUIRED_TYPES = ["select", "multi_select"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const existing = await context.tenantDb.customFieldDef.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Feld nicht gefunden." }, { status: 404 });
  }
  const nextType = body.type ?? existing.type;
  const nextOptions = Array.isArray(body.options) ? body.options : existing.options;
  if (OPTIONS_REQUIRED_TYPES.includes(nextType) && nextOptions.length === 0) {
    return NextResponse.json({ error: "select/multi_select-Felder benötigen mindestens eine Option." }, { status: 400 });
  }

  const field = await context.tenantDb.customFieldDef.update({
    where: { id },
    data: {
      label: typeof body.label === "string" ? body.label.trim() : undefined,
      options: Array.isArray(body.options) ? body.options : undefined,
    },
  });
  return NextResponse.json({ field });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const attachmentCount = await context.tenantDb.projectCustomField.count({ where: { fieldId: id } });
  if (attachmentCount > 0) {
    return NextResponse.json(
      { error: `Feld kann nicht gelöscht werden: an ${attachmentCount} Projekt(e) angehängt. Zuerst lösen.` },
      { status: 409 },
    );
  }

  await context.tenantDb.customFieldDef.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
