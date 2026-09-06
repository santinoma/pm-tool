import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  const { id, contactId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (typeof body.name === "string" && body.name.trim().length === 0) {
    return NextResponse.json({ error: "name darf nicht leer sein." }, { status: 400 });
  }

  const makesPrimary = body.isPrimary === true;

  const contact = await context.tenantDb.$transaction(async (tx) => {
    if (makesPrimary) {
      await tx.clientContact.updateMany({
        where: { clientId: id, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }
    return tx.clientContact.update({
      where: { id: contactId },
      data: {
        name: typeof body.name === "string" ? body.name : undefined,
        email: typeof body.email === "string" ? body.email : body.email === null ? null : undefined,
        phone: typeof body.phone === "string" ? body.phone : body.phone === null ? null : undefined,
        isPrimary: typeof body.isPrimary === "boolean" ? body.isPrimary : undefined,
      },
    });
  });

  return NextResponse.json({ contact });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  const { contactId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  await context.tenantDb.clientContact.delete({ where: { id: contactId } });
  return NextResponse.json({ ok: true });
}
