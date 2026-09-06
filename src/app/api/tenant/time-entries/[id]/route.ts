import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { getEntryDate, findCoveringLock } from "@/tenant/timeTracking/approval";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const existing = await context.tenantDb.timeEntry.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Zeiteintrag nicht gefunden." }, { status: 404 });
  }
  if (existing.userId !== context.currentUser.id && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const locks = await context.tenantDb.timesheetLock.findMany({ where: { userId: existing.userId } });
  if (findCoveringLock(getEntryDate(existing), locks)) {
    return NextResponse.json({ error: "Zeiterfassungsperiode ist gesperrt." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const startedAt = typeof body.startedAt === "string" ? new Date(body.startedAt) : undefined;
  const endedAt = typeof body.endedAt === "string" ? new Date(body.endedAt) : undefined;
  if ((startedAt && Number.isNaN(startedAt.getTime())) || (endedAt && Number.isNaN(endedAt.getTime()))) {
    return NextResponse.json({ error: "Ungültiges Datum." }, { status: 400 });
  }
  const effectiveStart = startedAt ?? existing.startedAt;
  const effectiveEnd = endedAt ?? existing.endedAt;
  if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
    return NextResponse.json({ error: "Ende muss nach dem Start liegen." }, { status: 400 });
  }

  const entry = await context.tenantDb.timeEntry.update({
    where: { id },
    data: {
      description: typeof body.description === "string" ? body.description : undefined,
      durationMinutes:
        typeof body.durationMinutes === "number"
          ? Math.round(body.durationMinutes)
          : startedAt && endedAt
            ? Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)
            : undefined,
      startedAt,
      endedAt,
    },
  });
  return NextResponse.json({ entry });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const existing = await context.tenantDb.timeEntry.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Zeiteintrag nicht gefunden." }, { status: 404 });
  }
  if (existing.userId !== context.currentUser.id && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const locks = await context.tenantDb.timesheetLock.findMany({ where: { userId: existing.userId } });
  if (findCoveringLock(getEntryDate(existing), locks)) {
    return NextResponse.json({ error: "Zeiterfassungsperiode ist gesperrt." }, { status: 409 });
  }

  await context.tenantDb.timeEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
