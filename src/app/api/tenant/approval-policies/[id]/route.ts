import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_MODES = ["any", "all", "none"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (body.timeApprovalMode !== undefined && !VALID_MODES.includes(body.timeApprovalMode)) {
    return NextResponse.json({ error: "Ungültiger timeApprovalMode." }, { status: 400 });
  }
  if (body.expenseApprovalMode !== undefined && !VALID_MODES.includes(body.expenseApprovalMode)) {
    return NextResponse.json({ error: "Ungültiger expenseApprovalMode." }, { status: 400 });
  }

  if (body.isDefault === true) {
    await context.tenantDb.approvalPolicy.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
  }

  const policy = await context.tenantDb.approvalPolicy.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      description: typeof body.description === "string" ? body.description.trim() || null : undefined,
      timeApprovalMode: body.timeApprovalMode ?? undefined,
      expenseApprovalMode: body.expenseApprovalMode ?? undefined,
      isDefault: typeof body.isDefault === "boolean" ? body.isDefault : undefined,
      archived: typeof body.archived === "boolean" ? body.archived : undefined,
    },
  });
  return NextResponse.json({ policy });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const budgetCount = await context.tenantDb.budget.count({ where: { approvalPolicyId: id } });
  if (budgetCount > 0) {
    return NextResponse.json(
      { error: `Policy kann nicht gelöscht werden: an ${budgetCount} Budget(s) zugewiesen.` },
      { status: 409 },
    );
  }

  await context.tenantDb.approvalPolicyApprover.deleteMany({ where: { policyId: id } });
  await context.tenantDb.approvalPolicy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
