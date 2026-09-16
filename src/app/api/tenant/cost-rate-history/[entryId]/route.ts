import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { resolveCurrentHourlyCost } from "@/tenant/costRates/costRateHistory";

export async function DELETE(_request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
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

  const entry = await context.tenantDb.costRateHistoryEntry.findUnique({ where: { id: entryId } });
  if (!entry) {
    return NextResponse.json({ error: "Eintrag nicht gefunden." }, { status: 404 });
  }

  await context.tenantDb.costRateHistoryEntry.delete({ where: { id: entryId } });

  const settings = await getOrCreateTenantSettings(context.tenantDb);
  const remaining = await context.tenantDb.costRateHistoryEntry.findMany({ where: { userId: entry.userId } });
  const currentHourlyCost = resolveCurrentHourlyCost(remaining, new Date(), settings.workingDays);
  await context.tenantDb.user.update({ where: { id: entry.userId }, data: { internalCostRate: currentHourlyCost } });

  return NextResponse.json({ ok: true });
}
