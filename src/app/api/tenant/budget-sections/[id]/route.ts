import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { resolveProjectIdForBudgetSection } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { recordActivity } from "@/tenant/notifications/recordActivity";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const VALID_BILLING_TYPES = ["fixed", "time_and_materials", "non_billable", "percentage"];
  const VALID_TRACKING_UNITS = ["hours", "days", "piece"];
  if (body.billingType !== undefined && !VALID_BILLING_TYPES.includes(body.billingType)) {
    return NextResponse.json({ error: "Ungültiger billingType." }, { status: 400 });
  }
  if (body.trackingUnit !== undefined && !VALID_TRACKING_UNITS.includes(body.trackingUnit)) {
    return NextResponse.json({ error: "Ungültiger trackingUnit." }, { status: 400 });
  }

  const section = await context.tenantDb.budgetSection.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      description:
        typeof body.description === "string" ? body.description : body.description === null ? null : undefined,
      budgetedTimeHours:
        typeof body.budgetedTimeHours === "number"
          ? body.budgetedTimeHours
          : body.budgetedTimeHours === null
            ? null
            : undefined,
      estimatedCost:
        typeof body.estimatedCost === "number" ? body.estimatedCost : body.estimatedCost === null ? null : undefined,
      quantity: typeof body.quantity === "number" ? body.quantity : undefined,
      price: typeof body.price === "number" ? body.price : undefined,
      budgetUsed: typeof body.budgetUsed === "number" ? body.budgetUsed : undefined,
      serviceTypeId:
        typeof body.serviceTypeId === "string" ? body.serviceTypeId : body.serviceTypeId === null ? null : undefined,
      billingType: body.billingType ?? undefined,
      trackingUnit: body.trackingUnit ?? undefined,
      discountPercent:
        typeof body.discountPercent === "number" ? body.discountPercent : body.discountPercent === null ? null : undefined,
      markupPercent:
        typeof body.markupPercent === "number" ? body.markupPercent : body.markupPercent === null ? null : undefined,
      guaranteedMaxPrice:
        typeof body.guaranteedMaxPrice === "number"
          ? body.guaranteedMaxPrice
          : body.guaranteedMaxPrice === null
            ? null
            : undefined,
      warningThresholdPercent:
        typeof body.warningThresholdPercent === "number"
          ? body.warningThresholdPercent
          : body.warningThresholdPercent === null
            ? null
            : undefined,
      blockOverrun: typeof body.blockOverrun === "boolean" ? body.blockOverrun : undefined,
      trackTime: typeof body.trackTime === "boolean" ? body.trackTime : undefined,
      trackExpenses: typeof body.trackExpenses === "boolean" ? body.trackExpenses : undefined,
      trackBooking: typeof body.trackBooking === "boolean" ? body.trackBooking : undefined,
      position: typeof body.position === "number" ? body.position : undefined,
    },
    include: { assignees: { include: { user: true } }, serviceType: true, budget: { select: { projectId: true, title: true } } },
  });

  await recordActivity(context.tenantDb, {
    projectId: section.budget.projectId,
    actorId: context.currentUser.id,
    type: "budget_section_updated",
    summary: `Service "${section.name}" wurde aktualisiert.`,
    budgetId: section.budgetId,
  });

  return NextResponse.json({ section });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const section = await context.tenantDb.budgetSection.findUnique({
    where: { id },
    include: { budget: { select: { projectId: true } } },
  });

  await context.tenantDb.budgetSectionAssignee.deleteMany({ where: { sectionId: id } });
  await context.tenantDb.budgetSection.delete({ where: { id } });

  if (section) {
    await recordActivity(context.tenantDb, {
      projectId: section.budget.projectId,
      actorId: context.currentUser.id,
      type: "budget_section_removed",
      summary: `Service "${section.name}" wurde entfernt.`,
      budgetId: section.budgetId,
    });
  }

  return NextResponse.json({ ok: true });
}
