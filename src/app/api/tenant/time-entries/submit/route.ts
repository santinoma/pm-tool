import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { findCoveringLock } from "@/tenant/timeTracking/approval";

// Weekly batch "Submit" action: moves every draft entry (submittedAt null) for
// the target user in [weekStart, weekEnd] into Submitted, making it visible to
// managers in the Approvals inbox. Mirrors Productive's Timesheet Submission.
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
      submittedAt: null,
      OR: [
        { startedAt: { gte: weekStart, lte: weekEnd } },
        { startedAt: null, createdAt: { gte: weekStart, lte: weekEnd } },
      ],
    },
  });
  const submittableIds = candidates.filter((entry) => !findCoveringLock(entry.startedAt ?? entry.createdAt, locks)).map((entry) => entry.id);

  if (submittableIds.length === 0) {
    return NextResponse.json({ submittedCount: 0 });
  }

  const result = await context.tenantDb.timeEntry.updateMany({
    where: { id: { in: submittableIds } },
    data: { submittedAt: new Date() },
  });
  return NextResponse.json({ submittedCount: result.count });
}
