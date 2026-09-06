import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_BILLING_TYPES = ["fixed", "time_and_materials", "non_billable", "percentage"];
const VALID_TRACKING_UNITS = ["hours", "days", "piece"];

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const rateCardItems = await context.tenantDb.rateCardItem.findMany({
    include: { serviceType: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ rateCardItems });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0 || typeof body.defaultPrice !== "number") {
    return NextResponse.json({ error: "name und defaultPrice sind erforderlich." }, { status: 400 });
  }
  if (body.billingType !== undefined && !VALID_BILLING_TYPES.includes(body.billingType)) {
    return NextResponse.json({ error: "Ungültiger billingType." }, { status: 400 });
  }
  if (body.trackingUnit !== undefined && !VALID_TRACKING_UNITS.includes(body.trackingUnit)) {
    return NextResponse.json({ error: "Ungültiger trackingUnit." }, { status: 400 });
  }

  const rateCardItem = await context.tenantDb.rateCardItem.create({
    data: {
      name: body.name,
      serviceTypeId: typeof body.serviceTypeId === "string" ? body.serviceTypeId : null,
      billingType: body.billingType ?? undefined,
      trackingUnit: body.trackingUnit ?? undefined,
      defaultPrice: body.defaultPrice,
    },
    include: { serviceType: true },
  });
  return NextResponse.json({ rateCardItem }, { status: 201 });
}
