import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const session = await context.tenantDb.session.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (session.userId !== context.currentUser.id) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  await context.tenantDb.session.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
