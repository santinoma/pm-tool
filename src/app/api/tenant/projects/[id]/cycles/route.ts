import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const cycles = await context.tenantDb.cycle.findMany({
    where: { projectId: id },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ cycles });
}

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
  if (
    !body ||
    typeof body.name !== "string" ||
    body.name.trim().length === 0 ||
    typeof body.startDate !== "string" ||
    typeof body.endDate !== "string"
  ) {
    return NextResponse.json({ error: "name, startDate und endDate sind erforderlich." }, { status: 400 });
  }
  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return NextResponse.json({ error: "Ungültiger Zeitraum." }, { status: 400 });
  }

  const cycle = await context.tenantDb.cycle.create({
    data: { projectId: id, name: body.name, startDate, endDate },
  });
  return NextResponse.json({ cycle }, { status: 201 });
}
