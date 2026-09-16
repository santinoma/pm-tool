import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { findCoveringLock } from "@/tenant/timeTracking/approval";
import { resolveTimeApprovalContext } from "@/tenant/timeTracking/approvalPolicy";

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

  const now = new Date();
  // Budgets whose policy needs "no approval" auto-approve on submit instead
  // of waiting in the Approvals inbox — resolved per entry since different
  // entries in the same week can belong to different budgets/policies.
  const autoApproveIds: string[] = [];
  for (const id of submittableIds) {
    const approvalContext = await context.tenantDb.timeEntry.findUnique({
      where: { id },
      select: { budgetSectionId: true },
    });
    if (!approvalContext?.budgetSectionId) continue;
    const resolved = await resolveTimeApprovalContext(context.tenantDb, id);
    if (resolved?.mode === "none") autoApproveIds.push(id);
  }
  const normalIds = submittableIds.filter((id) => !autoApproveIds.includes(id));

  const [normalResult, autoApproveResult] = await Promise.all([
    normalIds.length > 0
      ? context.tenantDb.timeEntry.updateMany({
          where: { id: { in: normalIds } },
          // Resets approvalStatus to "pending" too: a previously rejected entry
          // (submittedAt cleared on reject) must re-enter the approval queue on
          // resubmit, not stay stuck as "rejected" with no way to be found again.
          data: { submittedAt: now, approvalStatus: "pending" },
        })
      : Promise.resolve({ count: 0 }),
    autoApproveIds.length > 0
      ? context.tenantDb.timeEntry.updateMany({
          where: { id: { in: autoApproveIds } },
          data: { submittedAt: now, approvalStatus: "approved", approvedAt: now },
        })
      : Promise.resolve({ count: 0 }),
  ]);
  return NextResponse.json({ submittedCount: normalResult.count + autoApproveResult.count });
}
