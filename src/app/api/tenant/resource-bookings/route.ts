import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { validateBookingInput } from "@/tenant/resourcePlanning/capacity";

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const startDateParam = url.searchParams.get("startDate");
  const endDateParam = url.searchParams.get("endDate");

  if (projectId) {
    const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, projectId);
    if (denied) return denied;
  } else if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const startDate = startDateParam ? new Date(startDateParam) : null;
  const endDate = endDateParam ? new Date(endDateParam) : null;
  if ((startDateParam && Number.isNaN(startDate?.getTime())) || (endDateParam && Number.isNaN(endDate?.getTime()))) {
    return NextResponse.json({ error: "Ungültiger Zeitraum." }, { status: 400 });
  }

  const bookings = await context.tenantDb.resourceBooking.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(startDate ? { endDate: { gte: startDate } } : {}),
      ...(endDate ? { startDate: { lte: endDate } } : {}),
    },
    include: { user: true, project: true, budgetSection: true, createdBy: true },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json({ bookings });
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
  if (!body || typeof body.projectId !== "string" || typeof body.startDate !== "string" || typeof body.endDate !== "string" || typeof body.hoursPerDay !== "number") {
    return NextResponse.json(
      { error: "projectId, startDate, endDate und hoursPerDay sind erforderlich." },
      { status: 400 },
    );
  }

  const validation = validateBookingInput({
    userId: typeof body.userId === "string" ? body.userId : undefined,
    placeholderName: typeof body.placeholderName === "string" ? body.placeholderName : undefined,
    startDate: body.startDate,
    endDate: body.endDate,
  });
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, body.projectId);
  if (denied) return denied;

  const booking = await context.tenantDb.resourceBooking.create({
    data: {
      userId: typeof body.userId === "string" ? body.userId : null,
      placeholderName: typeof body.placeholderName === "string" ? body.placeholderName : null,
      projectId: body.projectId,
      budgetSectionId: typeof body.budgetSectionId === "string" ? body.budgetSectionId : null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      hoursPerDay: body.hoursPerDay,
      isTentative: body.isTentative === true,
      createdById: context.currentUser.id,
    },
    include: { user: true, project: true, budgetSection: true, createdBy: true },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
