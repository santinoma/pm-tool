import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { resolveProjectIdForInvoice } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

const VALID_STATUSES = ["draft", "finalized", "sent", "partially_paid", "paid"];

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

  const invoice = await context.tenantDb.invoice.findUnique({
    where: { id },
    include: { lineItems: true, payments: true, creditNotes: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ invoice });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const existing = await context.tenantDb.invoice.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const wantsLineItemEdit = body.lineItems !== undefined || body.taxRatePercent !== undefined;
  if (wantsLineItemEdit && existing.status !== "draft") {
    return NextResponse.json(
      { error: "Nur Entwürfe können bearbeitet werden — die Rechnung wurde bereits finalisiert." },
      { status: 409 },
    );
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `status muss eines von ${VALID_STATUSES.join(", ")} sein.` }, { status: 400 });
    }
    if (body.status === "draft" && existing.status !== "draft") {
      return NextResponse.json(
        { error: "Eine finalisierte Rechnung kann nicht wieder zum Entwurf zurückgesetzt werden." },
        { status: 409 },
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "finalized") {
      data.finalizedAt = new Date();
    }
  }
  if (body.taxRatePercent !== undefined) {
    data.taxRatePercent = body.taxRatePercent === null ? null : Number(body.taxRatePercent);
  }

  const invoice = await context.tenantDb.$transaction(async (tx) => {
    if (Array.isArray(body.lineItems)) {
      let totalAmount = 0;
      for (const item of body.lineItems) {
        totalAmount += Number(item.amount) || 0;
      }
      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoiceLineItem.createMany({
        data: body.lineItems.map((item: Record<string, unknown>) => ({
          invoiceId: id,
          budgetSectionId: String(item.budgetSectionId),
          description: String(item.description ?? ""),
          quantityHours: Number(item.quantityHours) || 0,
          rate: Number(item.rate) || 0,
          amount: Number(item.amount) || 0,
          taxRatePercent: item.taxRatePercent === undefined || item.taxRatePercent === null ? null : Number(item.taxRatePercent),
        })),
      });
      data.totalAmount = totalAmount;
    }

    return tx.invoice.update({
      where: { id },
      data,
      include: { lineItems: true, payments: true, creditNotes: true },
    });
  });

  return NextResponse.json({ invoice });
}
