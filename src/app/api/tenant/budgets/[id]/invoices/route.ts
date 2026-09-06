import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import {
  buildInvoiceLineItems,
  buildPercentageLineItems,
  buildRemainingAmountLineItems,
} from "@/tenant/invoicing/generateInvoice";
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

  const invoices = await context.tenantDb.invoice.findMany({
    where: { budgetId: id },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ invoices });
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
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.periodStart !== "string" || typeof body.periodEnd !== "string") {
    return NextResponse.json({ error: "periodStart und periodEnd sind erforderlich." }, { status: 400 });
  }
  const periodStart = new Date(body.periodStart);
  const periodEnd = new Date(body.periodEnd);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodEnd < periodStart) {
    return NextResponse.json({ error: "Ungültiger Zeitraum." }, { status: 400 });
  }

  const invoicingMethod: "uninvoiced_time_expenses" | "remaining_amount" | "percentage" =
    body.invoicingMethod && ["uninvoiced_time_expenses", "remaining_amount", "percentage"].includes(body.invoicingMethod)
      ? body.invoicingMethod
      : "uninvoiced_time_expenses";

  let percentage = 0;
  if (invoicingMethod === "percentage") {
    const parsed = typeof body.percentage === "number" ? body.percentage : Number(body.percentage);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
      return NextResponse.json({ error: "percentage ist erforderlich und muss zwischen 0 und 100 liegen." }, { status: 400 });
    }
    percentage = parsed;
  }

  const sections = await context.tenantDb.budgetSection.findMany({ where: { budgetId: id } });
  const sectionIds = sections.map((section) => section.id);

  let draft: { lineItems: { budgetSectionId: string; description: string; quantityHours: number; rate: number; amount: number }[]; totalAmount: number; timeEntryIds: string[] };

  if (invoicingMethod === "uninvoiced_time_expenses") {
    const entries = await context.tenantDb.timeEntry.findMany({
      where: {
        budgetSectionId: { in: sectionIds },
        invoiceId: null,
        startedAt: { gte: periodStart, lte: periodEnd },
        durationMinutes: { not: null },
        amount: { not: null },
      },
    });

    if (entries.length === 0) {
      return NextResponse.json({ error: "Keine abrechenbaren Zeiteinträge im gewählten Zeitraum." }, { status: 400 });
    }

    const sectionNames = Object.fromEntries(sections.map((section) => [section.id, section.name]));
    draft = buildInvoiceLineItems(
      entries.map((entry) => ({
        id: entry.id,
        budgetSectionId: entry.budgetSectionId!,
        durationMinutes: entry.durationMinutes!,
        amount: entry.amount!,
      })),
      sectionNames,
    );
  } else {
    const priorLineItems = await context.tenantDb.invoiceLineItem.groupBy({
      by: ["budgetSectionId"],
      where: { invoice: { budgetId: id } },
      _sum: { amount: true },
    });
    const invoicedAmountBySection = Object.fromEntries(
      priorLineItems.map((row) => [row.budgetSectionId, row._sum.amount ?? 0]),
    );

    draft =
      invoicingMethod === "remaining_amount"
        ? buildRemainingAmountLineItems(sections, invoicedAmountBySection)
        : buildPercentageLineItems(sections, percentage!);

    if (draft.lineItems.length === 0) {
      return NextResponse.json({ error: "Keine abrechenbaren Positionen." }, { status: 400 });
    }
  }

  const actorId = context.currentUser.id;
  const invoice = await context.tenantDb.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        budgetId: id,
        periodStart,
        periodEnd,
        totalAmount: draft.totalAmount,
        createdById: actorId,
        invoicingMethod,
        lineItems: { create: draft.lineItems },
      },
      include: { lineItems: true },
    });
    if (draft.timeEntryIds.length > 0) {
      await tx.timeEntry.updateMany({
        where: { id: { in: draft.timeEntryIds } },
        data: { invoiceId: created.id },
      });
    }
    return created;
  });

  const budget = await context.tenantDb.budget.findUnique({ where: { id }, select: { projectId: true, title: true } });
  if (budget) {
    await recordActivity(context.tenantDb, {
      projectId: budget.projectId,
      actorId,
      type: "invoice_created",
      summary: `Rechnung für Budget "${budget.title}" wurde erstellt (${draft.totalAmount.toFixed(2)}).`,
      budgetId: id,
    });
  }

  return NextResponse.json({ invoice }, { status: 201 });
}
