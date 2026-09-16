import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { resolveProjectIdForInvoice } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const denied = await assertSingleProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdForInvoice(context.tenantDb, id),
  );
  if (denied) return denied;

  const payments = await context.tenantDb.invoicePayment.findMany({
    where: { invoiceId: id },
    orderBy: { paidAt: "desc" },
  });
  return NextResponse.json({ payments });
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
    await resolveProjectIdForInvoice(context.tenantDb, id),
  );
  if (denied) return denied;
  const canManageInvoicing = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "invoicing_manage",
  );
  if (!canManageInvoicing) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const invoice = await context.tenantDb.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }
  if (invoice.status !== "sent" && invoice.status !== "partially_paid") {
    return NextResponse.json(
      { error: "Zahlungen können nur für versendete Rechnungen erfasst werden." },
      { status: 409 },
    );
  }

  const body = await request.json().catch(() => null);
  const amount = typeof body?.amount === "number" ? body.amount : Number(body?.amount);
  if (!body || !Number.isFinite(amount) || amount <= 0 || typeof body.paidAt !== "string") {
    return NextResponse.json({ error: "amount und paidAt sind erforderlich." }, { status: 400 });
  }
  const paidAt = new Date(body.paidAt);
  if (Number.isNaN(paidAt.getTime())) {
    return NextResponse.json({ error: "Ungültiges Datum." }, { status: 400 });
  }

  const actorId = context.currentUser.id;
  const result = await context.tenantDb.$transaction(async (tx) => {
    await tx.invoicePayment.create({
      data: {
        invoiceId: id,
        amount,
        paidAt,
        note: typeof body.note === "string" ? body.note : null,
        createdById: actorId,
      },
    });

    const paymentsAgg = await tx.invoicePayment.aggregate({
      where: { invoiceId: id },
      _sum: { amount: true },
    });
    const paidAmount = paymentsAgg._sum.amount ?? 0;
    const newStatus = paidAmount >= invoice.totalAmount ? "paid" : "partially_paid";

    return tx.invoice.update({
      where: { id },
      data: { paidAmount, status: newStatus },
      include: { lineItems: true, payments: true, creditNotes: true },
    });
  });

  return NextResponse.json({ invoice: result }, { status: 201 });
}
