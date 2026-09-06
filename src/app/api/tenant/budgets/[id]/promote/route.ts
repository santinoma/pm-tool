import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { resolveProjectIdForBudget } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { recordActivity } from "@/tenant/notifications/recordActivity";

/**
 * `id` ist die Szenario-Budget-ID. Übernimmt die Sections des Szenarios 1:1
 * in das Live-Budget (bestehende Live-Sections werden ersetzt, nicht
 * zusammengeführt) und löscht danach das Szenario.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const denied = await assertSingleProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdForBudget(context.tenantDb, id),
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

  const scenario = await context.tenantDb.budget.findUnique({
    where: { id },
    include: { sections: { include: { assignees: true } } },
  });
  if (!scenario || !scenario.isScenario || !scenario.scenarioOfId) {
    return NextResponse.json({ error: "Szenario nicht gefunden." }, { status: 404 });
  }

  const liveBudgetId = scenario.scenarioOfId;
  const liveBudget = await context.tenantDb.budget.findUnique({ where: { id: liveBudgetId } });
  if (!liveBudget) {
    return NextResponse.json({ error: "Live-Budget nicht gefunden." }, { status: 404 });
  }

  const existingSections = await context.tenantDb.budgetSection.findMany({
    where: { budgetId: liveBudgetId },
    select: { id: true },
  });
  await context.tenantDb.budgetSectionAssignee.deleteMany({
    where: { sectionId: { in: existingSections.map((s) => s.id) } },
  });
  await context.tenantDb.budgetSection.deleteMany({ where: { budgetId: liveBudgetId } });

  for (const section of scenario.sections) {
    await context.tenantDb.budgetSection.create({
      data: {
        budgetId: liveBudgetId,
        name: section.name,
        description: section.description,
        budgetedTimeHours: section.budgetedTimeHours,
        estimatedCost: section.estimatedCost,
        quantity: section.quantity,
        price: section.price,
        serviceTypeId: section.serviceTypeId,
        billingType: section.billingType,
        trackingUnit: section.trackingUnit,
        discountPercent: section.discountPercent,
        markupPercent: section.markupPercent,
        guaranteedMaxPrice: section.guaranteedMaxPrice,
        blockOverrun: section.blockOverrun,
        trackTime: section.trackTime,
        trackExpenses: section.trackExpenses,
        trackBooking: section.trackBooking,
        position: section.position,
        assignees: { create: section.assignees.map((a) => ({ userId: a.userId })) },
      },
    });
  }

  await context.tenantDb.budgetSectionAssignee.deleteMany({
    where: { sectionId: { in: scenario.sections.map((s) => s.id) } },
  });
  await context.tenantDb.budgetSection.deleteMany({ where: { budgetId: scenario.id } });
  await context.tenantDb.budget.delete({ where: { id: scenario.id } });

  await recordActivity(context.tenantDb, {
    projectId: liveBudget.projectId,
    actorId: context.currentUser.id,
    type: "budget_updated",
    summary: `Szenario "${scenario.title}" wurde als Live-Budget übernommen.`,
    budgetId: liveBudgetId,
  });

  return NextResponse.json({ budgetId: liveBudgetId });
}
