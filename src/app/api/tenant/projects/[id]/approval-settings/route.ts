import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || (typeof body.timeApprovalRequired !== "boolean" && typeof body.expenseApprovalRequired !== "boolean")) {
    return NextResponse.json({ error: "timeApprovalRequired oder expenseApprovalRequired ist erforderlich." }, { status: 400 });
  }

  const project = await context.tenantDb.project.update({
    where: { id },
    data: {
      ...(typeof body.timeApprovalRequired === "boolean" ? { timeApprovalRequired: body.timeApprovalRequired } : {}),
      ...(typeof body.expenseApprovalRequired === "boolean" ? { expenseApprovalRequired: body.expenseApprovalRequired } : {}),
    },
    select: { id: true, timeApprovalRequired: true, expenseApprovalRequired: true },
  });

  return NextResponse.json({ project });
}
