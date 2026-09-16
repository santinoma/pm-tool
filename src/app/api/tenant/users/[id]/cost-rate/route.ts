import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManageCostRates = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "cost_rates_manage",
  );
  if (!canManageCostRates) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (body?.internalCostRate !== null && typeof body?.internalCostRate !== "number") {
    return NextResponse.json({ error: "internalCostRate (number oder null) ist erforderlich." }, { status: 400 });
  }

  const user = await context.tenantDb.user.update({
    where: { id },
    data: { internalCostRate: body.internalCostRate },
  });
  return NextResponse.json({ user: { id: user.id, internalCostRate: user.internalCostRate } });
}
