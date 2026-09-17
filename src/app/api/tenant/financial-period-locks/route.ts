import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { listRecentMonths } from "@/tenant/financials/monthClosing";

const PERIOD_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Liefert die letzten 12 Monate (inkl. aktuellem) als "Month Overview"
 * (Productive: Settings > Financial Month Closing) — jeweils mit Auto-Sperr-
 * status und einer eventuell vorhandenen expliziten Übersteuerung.
 */
export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const months = await listRecentMonths(context.tenantDb);
  return NextResponse.json({ months });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManage = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "financial_month_closing_manage",
  );
  if (!canManage) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.periodKey !== "string" || !PERIOD_KEY_PATTERN.test(body.periodKey)) {
    return NextResponse.json({ error: "periodKey muss im Format YYYY-MM vorliegen." }, { status: 400 });
  }
  if (typeof body.locked !== "boolean") {
    return NextResponse.json({ error: "locked (boolean) ist erforderlich." }, { status: 400 });
  }

  const override = await context.tenantDb.financialPeriodLock.upsert({
    where: { periodKey: body.periodKey },
    create: { periodKey: body.periodKey, locked: body.locked, lockedById: context.currentUser.id },
    update: { locked: body.locked, lockedById: context.currentUser.id },
  });

  return NextResponse.json({ override });
}
