import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const { linkId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  await context.tenantDb.taskLink.delete({ where: { id: linkId } });
  return NextResponse.json({ success: true });
}
