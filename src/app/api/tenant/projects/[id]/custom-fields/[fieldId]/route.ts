import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> },
) {
  const { fieldId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  await context.tenantDb.customFieldDef.delete({ where: { id: fieldId } });
  return NextResponse.json({ ok: true });
}
