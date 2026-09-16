import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_CATEGORIES = ["open", "won", "lost"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; statusId: string }> }) {
  const { statusId } = await params;
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
  if (body.category !== undefined && !VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Ungültige Kategorie." }, { status: 400 });
  }

  const status = await context.tenantDb.dealStatus.update({
    where: { id: statusId },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      category: body.category,
      position: typeof body.position === "number" ? body.position : undefined,
      defaultProbability: body.defaultProbability === null ? null : typeof body.defaultProbability === "number" ? body.defaultProbability : undefined,
      trackTime: typeof body.trackTime === "boolean" ? body.trackTime : undefined,
      trackExpenses: typeof body.trackExpenses === "boolean" ? body.trackExpenses : undefined,
      createBookings: typeof body.createBookings === "boolean" ? body.createBookings : undefined,
    },
  });
  return NextResponse.json({ status });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; statusId: string }> }) {
  const { statusId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const dealCount = await context.tenantDb.deal.count({ where: { statusId } });
  if (dealCount > 0) {
    return NextResponse.json(
      { error: `Status kann nicht gelöscht werden: ${dealCount} Deal(s) referenzieren ihn noch.` },
      { status: 409 },
    );
  }

  await context.tenantDb.dealStatus.delete({ where: { id: statusId } });
  return NextResponse.json({ ok: true });
}
