import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { resolveProjectIdForBudgetSection } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { recordActivity } from "@/tenant/notifications/recordActivity";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const denied = await assertSingleProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdForBudgetSection(context.tenantDb, id),
  );
  if (denied) return denied;
  const canManageBudgets = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "budgets_manage",
  );
  if (!canManageBudgets) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const source = await context.tenantDb.budgetSection.findUnique({
    where: { id },
    include: { assignees: true, budget: { select: { projectId: true, title: true } } },
  });
  if (!source) {
    return NextResponse.json({ error: "Section nicht gefunden." }, { status: 404 });
  }

  const maxPosition = await context.tenantDb.budgetSection.aggregate({
    where: { budgetId: source.budgetId },
    _max: { position: true },
  });

  const duplicate = await context.tenantDb.budgetSection.create({
    data: {
      budgetId: source.budgetId,
      name: `${source.name} (Kopie)`,
      description: source.description,
      budgetedTimeHours: source.budgetedTimeHours,
      estimatedCost: source.estimatedCost,
      quantity: source.quantity,
      price: source.price,
      serviceTypeId: source.serviceTypeId,
      billingType: source.billingType,
      trackingUnit: source.trackingUnit,
      discountPercent: source.discountPercent,
      markupPercent: source.markupPercent,
      guaranteedMaxPrice: source.guaranteedMaxPrice,
      blockOverrun: source.blockOverrun,
      trackTime: source.trackTime,
      trackExpenses: source.trackExpenses,
      trackBooking: source.trackBooking,
      position: (maxPosition._max.position ?? -1) + 1,
      assignees: { create: source.assignees.map((a) => ({ userId: a.userId })) },
    },
    include: { assignees: { include: { user: true } }, serviceType: true },
  });

  await recordActivity(context.tenantDb, {
    projectId: source.budget.projectId,
    actorId: context.currentUser.id,
    type: "budget_section_added",
    summary: `Service "${duplicate.name}" wurde in Budget "${source.budget.title}" dupliziert.`,
    budgetId: source.budgetId,
  });

  return NextResponse.json({ section: duplicate }, { status: 201 });
}
