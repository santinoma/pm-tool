import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

// Backs the badge on the Approvals icon in the top nav — same three sources
// the Approvals inbox itself aggregates (time entries, expenses, absence
// requests), just counted instead of loaded in full.
export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const [timeEntries, expenses, absenceRequests] = await Promise.all([
    context.tenantDb.timeEntry.count({ where: { approvalStatus: "pending", submittedAt: { not: null } } }),
    context.tenantDb.expense.count({ where: { approvalStatus: "pending" } }),
    context.tenantDb.absenceRequest.count({ where: { status: "pending" } }),
  ]);

  return NextResponse.json({ count: timeEntries + expenses + absenceRequests });
}
