import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { resolveProjectIdForInvoice } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

const PAYABLE_STATUSES = ["sent", "partially_paid", "paid"];

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

  const creditNotes = await context.tenantDb.creditNote.findMany({
    where: { invoiceId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ creditNotes });
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
  if (!PAYABLE_STATUSES.includes(invoice.status)) {
    return NextResponse.json(
      { error: "Gutschriften können nur für versendete oder bezahlte Rechnungen erfasst werden." },
      { status: 409 },
    );
  }

  const body = await request.json().catch(() => null);
  const amount = typeof body?.amount === "number" ? body.amount : Number(body?.amount);
  if (!body || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount ist erforderlich." }, { status: 400 });
  }

  const creditNote = await context.tenantDb.creditNote.create({
    data: {
      invoiceId: id,
      amount,
      reason: typeof body.reason === "string" ? body.reason : null,
      createdById: context.currentUser.id,
    },
  });

  return NextResponse.json({ creditNote }, { status: 201 });
}
