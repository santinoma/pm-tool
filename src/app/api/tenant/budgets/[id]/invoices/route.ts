import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { buildInvoiceLineItems } from "@/tenant/invoicing/generateInvoice";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

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

  const sections = await context.tenantDb.budgetSection.findMany({ where: { budgetId: id } });
  const sectionIds = sections.map((section) => section.id);

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
  const draft = buildInvoiceLineItems(
    entries.map((entry) => ({
      id: entry.id,
      budgetSectionId: entry.budgetSectionId!,
      durationMinutes: entry.durationMinutes!,
      amount: entry.amount!,
    })),
    sectionNames,
  );

  const actorId = context.currentUser.id;
  const invoice = await context.tenantDb.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        budgetId: id,
        periodStart,
        periodEnd,
        totalAmount: draft.totalAmount,
        createdById: actorId,
        lineItems: { create: draft.lineItems },
      },
      include: { lineItems: true },
    });
    await tx.timeEntry.updateMany({
      where: { id: { in: draft.timeEntryIds } },
      data: { invoiceId: created.id },
    });
    return created;
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
