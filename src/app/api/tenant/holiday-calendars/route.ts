import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const holidayCalendars = await context.tenantDb.holidayCalendar.findMany({
    include: { holidays: { orderBy: { date: "asc" } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ holidayCalendars });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }
  if (body.country !== undefined && body.country !== null && typeof body.country !== "string") {
    return NextResponse.json({ error: "country muss ein String oder null sein." }, { status: 400 });
  }

  const holidayCalendar = await context.tenantDb.holidayCalendar.create({
    data: {
      name: body.name.trim(),
      country: body.country ?? null,
    },
    include: { holidays: true },
  });
  return NextResponse.json({ holidayCalendar }, { status: 201 });
}
