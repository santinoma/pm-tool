import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const requestedUserId = searchParams.get("userId");
  const isPrivileged = canManageMembers(context.currentUser.role);

  if (requestedUserId && requestedUserId !== context.currentUser.id && !isPrivileged) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const userId = requestedUserId ?? context.currentUser.id;
  const locks = await context.tenantDb.timesheetLock.findMany({
    where: { userId },
    orderBy: { periodStart: "desc" },
  });
  return NextResponse.json({ locks });
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
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : null;
  const periodStart = typeof body.periodStart === "string" ? new Date(body.periodStart) : null;
  const periodEnd = typeof body.periodEnd === "string" ? new Date(body.periodEnd) : null;

  if (
    !userId ||
    !periodStart ||
    !periodEnd ||
    Number.isNaN(periodStart.getTime()) ||
    Number.isNaN(periodEnd.getTime())
  ) {
    return NextResponse.json(
      { error: "userId, periodStart und periodEnd sind erforderlich." },
      { status: 400 },
    );
  }
  if (periodEnd.getTime() < periodStart.getTime()) {
    return NextResponse.json({ error: "periodEnd muss nach periodStart liegen." }, { status: 400 });
  }

  const lock = await context.tenantDb.timesheetLock.create({
    data: { userId, periodStart, periodEnd, lockedById: context.currentUser.id },
  });
  return NextResponse.json({ lock }, { status: 201 });
}
