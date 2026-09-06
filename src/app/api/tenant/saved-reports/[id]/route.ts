import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const existing = await context.tenantDb.savedReport.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Bericht nicht gefunden." }, { status: 404 });
  }
  if (existing.ownerId !== context.currentUser.id) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  await context.tenantDb.savedReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
