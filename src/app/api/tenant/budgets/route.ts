import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { recordActivity } from "@/tenant/notifications/recordActivity";
import { cloneBudgetSections } from "@/tenant/budgeting/cloneBudgetSections";
import type { BillingType, TrackingUnit } from "@/generated/tenant-client/client.js";

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId ist erforderlich." }, { status: 400 });
  }
  const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, projectId);
  if (denied) return denied;

  const budgets = await context.tenantDb.budget.findMany({
    where: { projectId },
    include: { owner: true, sections: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ budgets });
}

export async function POST(request: Request) {
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
  if (
    !body ||
    typeof body.projectId !== "string" ||
    typeof body.title !== "string" ||
    body.title.trim().length === 0 ||
    typeof body.ownerId !== "string"
  ) {
    return NextResponse.json(
      { error: "projectId, title und ownerId sind erforderlich." },
      { status: 400 },
    );
  }
  const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, body.projectId);
  if (denied) return denied;

  const isRetainer = body.isRetainer === true;
  if (isRetainer && body.recurrenceInterval !== "weekly" && body.recurrenceInterval !== "monthly") {
    return NextResponse.json(
      { error: "recurrenceInterval muss 'weekly' oder 'monthly' sein, wenn isRetainer gesetzt ist." },
      { status: 400 },
    );
  }

  const startDate = typeof body.startDate === "string" ? new Date(body.startDate) : null;
  const endDate = typeof body.endDate === "string" ? new Date(body.endDate) : null;
  if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
    return NextResponse.json({ error: "Ungültiges Datum." }, { status: 400 });
  }
  if (startDate && endDate && endDate < startDate) {
    return NextResponse.json({ error: "endDate muss nach startDate liegen." }, { status: 400 });
  }

  let templateSections: Awaited<ReturnType<typeof context.tenantDb.budgetSection.findMany>> = [];
  if (typeof body.templateBudgetId === "string" && body.templateBudgetId.length > 0) {
    const template = await context.tenantDb.budget.findUnique({
      where: { id: body.templateBudgetId },
      include: { sections: true },
    });
    if (!template || !template.isTemplate || template.projectId !== body.projectId) {
      return NextResponse.json({ error: "Ungültige Budget-Vorlage." }, { status: 400 });
    }
    templateSections = template.sections;
  }

  const budget = await context.tenantDb.budget.create({
    data: {
      projectId: body.projectId,
      title: body.title,
      ownerId: body.ownerId,
      isRetainer,
      recurrenceInterval: isRetainer ? body.recurrenceInterval : null,
      startDate,
      endDate,
      color: typeof body.color === "string" ? body.color : null,
      sections:
        templateSections.length > 0
          ? {
              create: cloneBudgetSections(templateSections).map((section) => ({
                ...section,
                billingType: section.billingType as BillingType,
                trackingUnit: section.trackingUnit as TrackingUnit,
              })),
            }
          : undefined,
    },
    include: { owner: true, sections: true },
  });

  await recordActivity(context.tenantDb, {
    projectId: budget.projectId,
    actorId: context.currentUser.id,
    type: "budget_created",
    summary: `Budget "${budget.title}" wurde angelegt.`,
    budgetId: budget.id,
  });

  return NextResponse.json({ budget }, { status: 201 });
}
