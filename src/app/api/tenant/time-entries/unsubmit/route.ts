import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { findCoveringLock } from "@/tenant/timeTracking/approval";

// Weekly batch "Un-submit" action: pulls every not-yet-approved entry back
// into Draft, e.g. to fix a mistake before a manager reviews it. Already
// approved entries must be un-approved by a manager first.
export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const weekStart = typeof body?.weekStart === "string" ? new Date(body.weekStart) : null;
  const weekEnd = typeof body?.weekEnd === "string" ? new Date(body.weekEnd) : null;
  if (!weekStart || !weekEnd || Number.isNaN(weekStart.getTime()) || Number.isNaN(weekEnd.getTime())) {
    return NextResponse.json({ error: "weekStart und weekEnd sind erforderlich." }, { status: 400 });
  }

  const targetUserId = typeof body?.userId === "string" && canManageMembers(context.currentUser.role) ? body.userId : context.currentUser.id;

  const locks = await context.tenantDb.timesheetLock.findMany({ where: { userId: targetUserId } });
  const candidates = await context.tenantDb.timeEntry.findMany({
    where: {
      userId: targetUserId,
      submittedAt: { not: null },
      approvalStatus: { not: "approved" },
      OR: [
        { startedAt: { gte: weekStart, lte: weekEnd } },
        { startedAt: null, createdAt: { gte: weekStart, lte: weekEnd } },
      ],
    },
  });
  const unsubmittableIds = candidates.filter((entry) => !findCoveringLock(entry.startedAt ?? entry.createdAt, locks)).map((entry) => entry.id);

  if (unsubmittableIds.length === 0) {
    return NextResponse.json({ unsubmittedCount: 0 });
  }

  const result = await context.tenantDb.timeEntry.updateMany({
    where: { id: { in: unsubmittableIds } },
    data: { submittedAt: null },
  });
  return NextResponse.json({ unsubmittedCount: result.count });
}
