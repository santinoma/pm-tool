import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const TEMPLATE_CSV =
  "title,status,assigneeEmail,dueDate,estimatedHours\n" +
  "Beispiel-Task,Open,alice@example.com,2026-09-01,4\n";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  return new NextResponse(TEMPLATE_CSV, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="tasks-import-vorlage.csv"',
    },
  });
}
