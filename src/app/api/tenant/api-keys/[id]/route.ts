import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const key = await context.tenantDb.apiKey.findUnique({ where: { id } });
  if (!key || key.userId !== context.currentUser.id) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  await context.tenantDb.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  return NextResponse.json({ success: true });
}
