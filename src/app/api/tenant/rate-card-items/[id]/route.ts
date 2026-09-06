import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_BILLING_TYPES = ["fixed", "time_and_materials", "non_billable", "percentage"];
const VALID_TRACKING_UNITS = ["hours", "days", "piece"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (body.billingType !== undefined && !VALID_BILLING_TYPES.includes(body.billingType)) {
    return NextResponse.json({ error: "Ungültiger billingType." }, { status: 400 });
  }
  if (body.trackingUnit !== undefined && !VALID_TRACKING_UNITS.includes(body.trackingUnit)) {
    return NextResponse.json({ error: "Ungültiger trackingUnit." }, { status: 400 });
  }

  const rateCardItem = await context.tenantDb.rateCardItem.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      serviceTypeId:
        typeof body.serviceTypeId === "string" ? body.serviceTypeId : body.serviceTypeId === null ? null : undefined,
      billingType: body.billingType ?? undefined,
      trackingUnit: body.trackingUnit ?? undefined,
      defaultPrice: typeof body.defaultPrice === "number" ? body.defaultPrice : undefined,
    },
    include: { serviceType: true },
  });
  return NextResponse.json({ rateCardItem });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  await context.tenantDb.rateCardItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
