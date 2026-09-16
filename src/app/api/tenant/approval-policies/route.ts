import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_MODES = ["any", "all", "none"];

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const policies = await context.tenantDb.approvalPolicy.findMany({
    include: {
      approvers: { include: { specificUser: { select: { id: true, name: true, email: true } } } },
      _count: { select: { budgets: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ policies });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }
  if (body.timeApprovalMode !== undefined && !VALID_MODES.includes(body.timeApprovalMode)) {
    return NextResponse.json({ error: "Ungültiger timeApprovalMode." }, { status: 400 });
  }
  if (body.expenseApprovalMode !== undefined && !VALID_MODES.includes(body.expenseApprovalMode)) {
    return NextResponse.json({ error: "Ungültiger expenseApprovalMode." }, { status: 400 });
  }

  if (body.isDefault === true) {
    await context.tenantDb.approvalPolicy.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const policy = await context.tenantDb.approvalPolicy.create({
    data: {
      name: body.name.trim(),
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      timeApprovalMode: body.timeApprovalMode ?? "any",
      expenseApprovalMode: body.expenseApprovalMode ?? "any",
      isDefault: body.isDefault === true,
    },
  });
  return NextResponse.json({ policy }, { status: 201 });
}
