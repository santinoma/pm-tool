import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { getEntryDate, findCoveringLock } from "@/tenant/timeTracking/approval";
import { recordApprovalDecision } from "@/tenant/timeTracking/approvalPolicy";

// "Requesting Changes to Time Entries": rejecting an entry sends it back to
// the submitter as a Draft (submittedAt cleared) with the approver's reason
// attached, so they can fix it and manually resubmit via the normal Submit
// action.
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

  if (existing.submittedAt === null) {
    return NextResponse.json({ error: "Eintrag wurde noch nicht eingereicht." }, { status: 409 });
  }

  const locks = await context.tenantDb.timesheetLock.findMany({ where: { userId: existing.userId } });
  if (findCoveringLock(getEntryDate(existing), locks)) {
    return NextResponse.json({ error: "Zeiterfassungsperiode ist gesperrt." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : null;

  const result = await recordApprovalDecision(context.tenantDb, id, context.currentUser, "rejected");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  const entry = await context.tenantDb.timeEntry.update({
    where: { id },
    data: { rejectionReason: reason, submittedAt: null },
  });
  return NextResponse.json({ entry });
}
