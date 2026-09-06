import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const date = typeof body.date === "string" ? new Date(body.date) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "date (ISO-String) ist erforderlich." }, { status: 400 });
  }

  const calendar = await context.tenantDb.holidayCalendar.findUnique({ where: { id } });
  if (!calendar) {
    return NextResponse.json({ error: "Kalender nicht gefunden." }, { status: 404 });
  }

  const holiday = await context.tenantDb.holiday.create({
    data: {
      calendarId: id,
      date,
      name: body.name.trim(),
    },
  });
  return NextResponse.json({ holiday }, { status: 201 });
}
