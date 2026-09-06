import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTimeTrackingPolicy } from "@/tenant/timeTracking/policy";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const policy = await getOrCreateTimeTrackingPolicy(context.tenantDb);
  return NextResponse.json({ policy });
}

export async function PUT(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (
    body.maxDailyHours !== undefined &&
    body.maxDailyHours !== null &&
    (typeof body.maxDailyHours !== "number" || !Number.isFinite(body.maxDailyHours) || body.maxDailyHours <= 0)
  ) {
    return NextResponse.json(
      { error: "maxDailyHours muss eine positive Zahl oder null sein." },
      { status: 400 },
    );
  }
  if (body.blockWeekends !== undefined && typeof body.blockWeekends !== "boolean") {
    return NextResponse.json({ error: "blockWeekends muss ein Boolean sein." }, { status: 400 });
  }
  if (body.blockOverlaps !== undefined && typeof body.blockOverlaps !== "boolean") {
    return NextResponse.json({ error: "blockOverlaps muss ein Boolean sein." }, { status: 400 });
  }

  const current = await getOrCreateTimeTrackingPolicy(context.tenantDb);
  const updated = await context.tenantDb.timeTrackingPolicy.update({
    where: { id: current.id },
    data: {
      maxDailyHours:
        body.maxDailyHours === undefined
          ? undefined
          : body.maxDailyHours === null
            ? null
            : body.maxDailyHours,
      blockWeekends: typeof body.blockWeekends === "boolean" ? body.blockWeekends : undefined,
      blockOverlaps: typeof body.blockOverlaps === "boolean" ? body.blockOverlaps : undefined,
    },
  });

  return NextResponse.json({ policy: updated });
}
