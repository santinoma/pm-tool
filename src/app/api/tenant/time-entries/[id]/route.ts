import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { getEntryDate, findCoveringLock } from "@/tenant/timeTracking/approval";
import { resolveTimeApprovalContext } from "@/tenant/timeTracking/approvalPolicy";
import { assertPeriodNotLocked } from "@/tenant/financials/monthClosing";

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
  if (existing.approvalStatus === "approved") {
    return NextResponse.json({ error: "Freigegebene Zeiteinträge können nicht mehr geändert werden." }, { status: 409 });
  }

  const locks = await context.tenantDb.timesheetLock.findMany({ where: { userId: existing.userId } });
  if (findCoveringLock(getEntryDate(existing), locks)) {
    return NextResponse.json({ error: "Zeiterfassungsperiode ist gesperrt." }, { status: 409 });
  }
  const lockError = await assertPeriodNotLocked(context.tenantDb, getEntryDate(existing));
  if (lockError) {
    return NextResponse.json({ error: lockError }, { status: 409 });
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

  const changesTarget = typeof body.taskId === "string" || typeof body.projectId === "string";

  // Editing a rejected ("Änderung angefordert") entry is how the submitter
  // acts on it: fixing it and saving sends it straight back into the
  // approval queue, mirroring the batch "Woche einreichen" resubmit flow —
  // no separate manual submit step is required.
  const wasRejected = existing.approvalStatus === "rejected";
  let resubmitData: Record<string, unknown> = {};
  if (wasRejected) {
    // Same per-budget "no approval required" resolution the batch "Woche
    // einreichen" resubmit flow uses, so an edited entry doesn't get stuck
    // pending when its budget's policy would have auto-approved it anyway.
    const approvalContext = existing.budgetSectionId ? await resolveTimeApprovalContext(context.tenantDb, id) : null;
    const now = new Date();
    resubmitData =
      approvalContext?.mode === "none"
        ? { approvalStatus: "approved", submittedAt: now, approvedAt: now, rejectionReason: null }
        : { approvalStatus: "pending", submittedAt: now, rejectionReason: null, approvedById: null, approvedAt: null };
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
      ...(typeof body.taskId === "string" ? { taskId: body.taskId, projectId: null } : {}),
      ...(typeof body.projectId === "string" ? { projectId: body.projectId, taskId: null } : {}),
      ...(changesTarget ? { budgetSectionId: null } : {}),
      ...resubmitData,
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
  if (existing.approvalStatus === "approved") {
    return NextResponse.json({ error: "Freigegebene Zeiteinträge können nicht mehr gelöscht werden." }, { status: 409 });
  }

  const locks = await context.tenantDb.timesheetLock.findMany({ where: { userId: existing.userId } });
  if (findCoveringLock(getEntryDate(existing), locks)) {
    return NextResponse.json({ error: "Zeiterfassungsperiode ist gesperrt." }, { status: 409 });
  }
  const lockError = await assertPeriodNotLocked(context.tenantDb, getEntryDate(existing));
  if (lockError) {
    return NextResponse.json({ error: lockError }, { status: 409 });
  }

  await context.tenantDb.timeEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
