import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { resolveProjectIdForBudget } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { recordActivity } from "@/tenant/notifications/recordActivity";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const scenarios = await context.tenantDb.budget.findMany({
    where: { scenarioOfId: id },
    include: { owner: true, sections: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ scenarios });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const source = await context.tenantDb.budget.findUnique({
    where: { id },
    include: { sections: { include: { assignees: true } } },
  });
  if (!source) {
    return NextResponse.json({ error: "Budget nicht gefunden." }, { status: 404 });
  }
  if (source.isScenario) {
    return NextResponse.json({ error: "Aus einem Szenario kann kein weiteres Szenario erstellt werden." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === "string" && body.title.trim().length > 0 ? body.title : `${source.title} (Szenario)`;

  const scenario = await context.tenantDb.budget.create({
    data: {
      projectId: source.projectId,
      title,
      ownerId: source.ownerId,
      isRetainer: source.isRetainer,
      recurrenceInterval: source.recurrenceInterval,
      startDate: source.startDate,
      endDate: source.endDate,
      color: source.color,
      isScenario: true,
      scenarioOfId: source.id,
      sections: {
        create: source.sections.map((section) => ({
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
        })),
      },
    },
    include: { owner: true, sections: true },
  });

  await recordActivity(context.tenantDb, {
    projectId: source.projectId,
    actorId: context.currentUser.id,
    type: "budget_created",
    summary: `Szenario "${scenario.title}" wurde aus Budget "${source.title}" erstellt.`,
    budgetId: source.id,
  });

  return NextResponse.json({ scenario }, { status: 201 });
}
