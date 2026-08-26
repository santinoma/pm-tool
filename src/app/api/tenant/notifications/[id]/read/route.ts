import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const notification = await context.tenantDb.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== context.currentUser.id) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const updated = await context.tenantDb.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ notification: updated });
}
