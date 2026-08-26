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

  if (Array.isArray(body.assigneeIds)) {
    await context.tenantDb.budgetSectionAssignee.deleteMany({ where: { sectionId: id } });
    if (body.assigneeIds.length > 0) {
      await context.tenantDb.budgetSectionAssignee.createMany({
        data: body.assigneeIds.map((userId: string) => ({ sectionId: id, userId })),
      });
    }
  }

  const section = await context.tenantDb.budgetSection.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      budgetedTimeHours:
        typeof body.budgetedTimeHours === "number"
          ? body.budgetedTimeHours
          : body.budgetedTimeHours === null
            ? null
            : undefined,
      quantity: typeof body.quantity === "number" ? body.quantity : undefined,
      price: typeof body.price === "number" ? body.price : undefined,
      budgetUsed: typeof body.budgetUsed === "number" ? body.budgetUsed : undefined,
    },
    include: { assignees: { include: { user: true } } },
  });
  return NextResponse.json({ section });
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

  await context.tenantDb.budgetSectionAssignee.deleteMany({ where: { sectionId: id } });
  await context.tenantDb.budgetSection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
