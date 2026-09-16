import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { getEntryDate, findCoveringLock } from "@/tenant/timeTracking/approval";

// Hinweis: Ablehnungsgründe werden derzeit nicht persistiert — das Prisma-Schema
// besitzt kein Feld dafür (siehe Aufgabenbeschreibung: schema.prisma nicht anfassen).
// Ein optionales `reason` im Body wird entgegengenommen, aber verworfen.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const existing = await context.tenantDb.timeEntry.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Zeiteintrag nicht gefunden." }, { status: 404 });
  }

  if (existing.submittedAt === null) {
    return NextResponse.json({ error: "Eintrag wurde noch nicht eingereicht." }, { status: 409 });
  }

  const locks = await context.tenantDb.timesheetLock.findMany({ where: { userId: existing.userId } });
  if (findCoveringLock(getEntryDate(existing), locks)) {
    return NextResponse.json({ error: "Zeiterfassungsperiode ist gesperrt." }, { status: 409 });
  }

  const entry = await context.tenantDb.timeEntry.update({
    where: { id },
    data: {
      approvalStatus: "rejected",
      approvedById: context.currentUser.id,
      approvedAt: new Date(),
    },
  });
  return NextResponse.json({ entry });
}
