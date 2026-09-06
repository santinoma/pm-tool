import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { validateBookingInput } from "@/tenant/resourcePlanning/capacity";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const existing = await context.tenantDb.resourceBooking.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Buchung nicht gefunden." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const nextUserId = "userId" in body ? (typeof body.userId === "string" ? body.userId : null) : existing.userId;
  const nextPlaceholderName =
    "placeholderName" in body ? (typeof body.placeholderName === "string" ? body.placeholderName : null) : existing.placeholderName;
  const nextStartDate = typeof body.startDate === "string" ? body.startDate : existing.startDate.toISOString();
  const nextEndDate = typeof body.endDate === "string" ? body.endDate : existing.endDate.toISOString();

  const validation = validateBookingInput({
    userId: nextUserId ?? undefined,
    placeholderName: nextPlaceholderName ?? undefined,
    startDate: nextStartDate,
    endDate: nextEndDate,
  });
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const booking = await context.tenantDb.resourceBooking.update({
    where: { id },
    data: {
      userId: nextUserId,
      placeholderName: nextPlaceholderName,
      startDate: new Date(nextStartDate),
      endDate: new Date(nextEndDate),
      hoursPerDay: typeof body.hoursPerDay === "number" ? body.hoursPerDay : existing.hoursPerDay,
      isTentative: typeof body.isTentative === "boolean" ? body.isTentative : existing.isTentative,
      budgetSectionId:
        "budgetSectionId" in body
          ? typeof body.budgetSectionId === "string"
            ? body.budgetSectionId
            : null
          : existing.budgetSectionId,
    },
    include: { user: true, project: true, budgetSection: true, createdBy: true },
  });

  return NextResponse.json({ booking });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const existing = await context.tenantDb.resourceBooking.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Buchung nicht gefunden." }, { status: 404 });
  }

  await context.tenantDb.resourceBooking.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
