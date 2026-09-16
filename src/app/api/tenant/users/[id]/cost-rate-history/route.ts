import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { resolveCurrentHourlyCost } from "@/tenant/costRates/costRateHistory";
import type { CostRateType } from "@/generated/tenant-client/client.js";

const VALID_RATE_TYPES: CostRateType[] = ["hourly", "weekly", "biweekly", "monthly", "annual"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const entries = await context.tenantDb.costRateHistoryEntry.findMany({
    where: { userId: id },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ entries });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (!body || !VALID_RATE_TYPES.includes(body.rateType)) {
    return NextResponse.json({ error: "Ungültiger rateType." }, { status: 400 });
  }
  if (typeof body.amount !== "number" || body.amount < 0) {
    return NextResponse.json({ error: "amount muss eine positive Zahl sein." }, { status: 400 });
  }
  const startDate = typeof body.startDate === "string" ? new Date(body.startDate) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "startDate ist erforderlich." }, { status: 400 });
  }

  // Productive: Cost-Rate-Perioden überlappen nicht — ein neuer Eintrag
  // beendet automatisch den zuvor offen laufenden Eintrag am Vortag seines
  // Starts ("schedule an additional cost rate to begin in the future").
  await context.tenantDb.costRateHistoryEntry.updateMany({
    where: { userId: id, endDate: null, startDate: { lt: startDate } },
    data: { endDate: new Date(startDate.getTime() - 24 * 60 * 60 * 1000) },
  });

  const entry = await context.tenantDb.costRateHistoryEntry.create({
    data: {
      userId: id,
      rateType: body.rateType,
      amount: body.amount,
      currency: typeof body.currency === "string" ? body.currency : "EUR",
      workHoursPerDay: typeof body.workHoursPerDay === "number" ? body.workHoursPerDay : 8,
      startDate,
      endDate: typeof body.endDate === "string" ? new Date(body.endDate) : null,
      createdById: context.currentUser.id,
    },
  });

  // `User.internalCostRate` bleibt der synchron gepflegte Cache des aktuell
  // gültigen Stundensatzes, den bestehende Profitabilitäts-Berechnungen
  // lesen — nur relevant, wenn der neue (oder ein weiterhin aktiver älterer)
  // Eintrag JETZT gilt; ein rein zukünftiger Eintrag ändert den Cache noch
  // nicht.
  const settings = await getOrCreateTenantSettings(context.tenantDb);
  const allEntries = await context.tenantDb.costRateHistoryEntry.findMany({ where: { userId: id } });
  const currentHourlyCost = resolveCurrentHourlyCost(allEntries, new Date(), settings.workingDays);
  await context.tenantDb.user.update({ where: { id }, data: { internalCostRate: currentHourlyCost } });

  return NextResponse.json({ entry }, { status: 201 });
}
