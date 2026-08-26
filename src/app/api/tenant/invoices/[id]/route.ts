import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_STATUSES = ["draft", "sent", "paid"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `status muss eines von ${VALID_STATUSES.join(", ")} sein.` }, { status: 400 });
  }

  const invoice = await context.tenantDb.invoice.update({
    where: { id },
    data: { status: body.status },
  });
  return NextResponse.json({ invoice });
}
