import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManageBudgets = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "budgets_manage",
  );
  if (!canManageBudgets) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const budget = await context.tenantDb.budget.update({
    where: { id },
    data: {
      title: typeof body.title === "string" ? body.title : undefined,
      ownerId: typeof body.ownerId === "string" ? body.ownerId : undefined,
    },
  });
  return NextResponse.json({ budget });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManageBudgets = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "budgets_manage",
  );
  if (!canManageBudgets) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const sections = await context.tenantDb.budgetSection.findMany({ where: { budgetId: id }, select: { id: true } });
  await context.tenantDb.budgetSectionAssignee.deleteMany({
    where: { sectionId: { in: sections.map((s) => s.id) } },
  });
  await context.tenantDb.budgetSection.deleteMany({ where: { budgetId: id } });
  await context.tenantDb.budget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
