import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_STATUSES = ["approved", "rejected"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "status ('approved'|'rejected') ist erforderlich." }, { status: 400 });
  }

  const existing = await context.tenantDb.absenceRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Antrag nicht gefunden." }, { status: 404 });
  }

  const updated = await context.tenantDb.absenceRequest.update({
    where: { id },
    data: {
      status: body.status,
      reviewedById: context.currentUser.id,
      reviewedAt: new Date(),
    },
  });
  return NextResponse.json({ request: updated });
}
