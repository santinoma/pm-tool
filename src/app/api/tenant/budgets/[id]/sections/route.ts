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

  const sections = await context.tenantDb.budgetSection.findMany({
    where: { budgetId: id },
    include: { assignees: { include: { user: true } }, serviceType: true },
    orderBy: { position: "asc" },
  });
  return NextResponse.json({ sections });
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

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    body.name.trim().length === 0 ||
    typeof body.quantity !== "number" ||
    typeof body.price !== "number"
  ) {
    return NextResponse.json(
      { error: "name, quantity und price sind erforderlich." },
      { status: 400 },
    );
  }
  const assigneeIds: string[] = Array.isArray(body.assigneeIds) ? body.assigneeIds : [];

  const VALID_BILLING_TYPES = ["fixed", "time_and_materials", "non_billable", "percentage"];
  const VALID_TRACKING_UNITS = ["hours", "days", "piece"];
  if (body.billingType !== undefined && !VALID_BILLING_TYPES.includes(body.billingType)) {
    return NextResponse.json({ error: "Ungültiger billingType." }, { status: 400 });
  }
  if (body.trackingUnit !== undefined && !VALID_TRACKING_UNITS.includes(body.trackingUnit)) {
    return NextResponse.json({ error: "Ungültiger trackingUnit." }, { status: 400 });
  }

  const maxPosition = await context.tenantDb.budgetSection.aggregate({
    where: { budgetId: id },
    _max: { position: true },
  });

  const section = await context.tenantDb.budgetSection.create({
    data: {
      budgetId: id,
      name: body.name,
      description: typeof body.description === "string" ? body.description : null,
      budgetedTimeHours: typeof body.budgetedTimeHours === "number" ? body.budgetedTimeHours : null,
      estimatedCost: typeof body.estimatedCost === "number" ? body.estimatedCost : null,
      quantity: body.quantity,
      price: body.price,
      serviceTypeId: typeof body.serviceTypeId === "string" ? body.serviceTypeId : null,
      billingType: body.billingType ?? undefined,
      trackingUnit: body.trackingUnit ?? undefined,
      discountPercent: typeof body.discountPercent === "number" ? body.discountPercent : null,
      markupPercent: typeof body.markupPercent === "number" ? body.markupPercent : null,
      guaranteedMaxPrice: typeof body.guaranteedMaxPrice === "number" ? body.guaranteedMaxPrice : null,
      blockOverrun: body.blockOverrun === true,
      trackTime: typeof body.trackTime === "boolean" ? body.trackTime : true,
      trackExpenses: typeof body.trackExpenses === "boolean" ? body.trackExpenses : false,
      trackBooking: typeof body.trackBooking === "boolean" ? body.trackBooking : false,
      position: (maxPosition._max.position ?? -1) + 1,
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
    },
    include: { assignees: { include: { user: true } }, serviceType: true },
  });

  const budget = await context.tenantDb.budget.findUnique({ where: { id }, select: { projectId: true, title: true } });
  if (budget) {
    await recordActivity(context.tenantDb, {
      projectId: budget.projectId,
      actorId: context.currentUser.id,
      type: "budget_section_added",
      summary: `Service "${section.name}" wurde zu Budget "${budget.title}" hinzugefügt.`,
      budgetId: id,
    });
  }

  return NextResponse.json({ section }, { status: 201 });
}
