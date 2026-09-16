import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { resolveProjectIdForBudget } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { recordActivity } from "@/tenant/notifications/recordActivity";
import type { BillableRateStrategy } from "@/generated/tenant-client/client.js";

const VALID_BILLABLE_RATE_STRATEGIES = ["person", "service", "single", "no_rate"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const startDate = typeof body.startDate === "string" ? new Date(body.startDate) : undefined;
  const endDate = typeof body.endDate === "string" ? new Date(body.endDate) : undefined;
  if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
    return NextResponse.json({ error: "Ungültiges Datum." }, { status: 400 });
  }

  if (body.billableRateStrategy !== undefined && !VALID_BILLABLE_RATE_STRATEGIES.includes(body.billableRateStrategy)) {
    return NextResponse.json({ error: "Ungültige billableRateStrategy." }, { status: 400 });
  }

  const budget = await context.tenantDb.budget.update({
    where: { id },
    data: {
      title: typeof body.title === "string" ? body.title : undefined,
      ownerId: typeof body.ownerId === "string" ? body.ownerId : undefined,
      startDate: body.startDate === null ? null : startDate,
      endDate: body.endDate === null ? null : endDate,
      color: typeof body.color === "string" ? body.color : body.color === null ? null : undefined,
      isTemplate: typeof body.isTemplate === "boolean" ? body.isTemplate : undefined,
      billableRateStrategy: (body.billableRateStrategy as BillableRateStrategy) ?? undefined,
      billableRate:
        typeof body.billableRate === "number" ? body.billableRate : body.billableRate === null ? null : undefined,
      approvalPolicyId:
        typeof body.approvalPolicyId === "string" ? body.approvalPolicyId : body.approvalPolicyId === null ? null : undefined,
    },
  });

  await recordActivity(context.tenantDb, {
    projectId: budget.projectId,
    actorId: context.currentUser.id,
    type: "budget_updated",
    summary: `Budget "${budget.title}" wurde aktualisiert.`,
    budgetId: budget.id,
  });

  return NextResponse.json({ budget });
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

  const sections = await context.tenantDb.budgetSection.findMany({ where: { budgetId: id }, select: { id: true } });
  await context.tenantDb.budgetSectionAssignee.deleteMany({
    where: { sectionId: { in: sections.map((s) => s.id) } },
  });
  await context.tenantDb.budgetSection.deleteMany({ where: { budgetId: id } });
  await context.tenantDb.budget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
