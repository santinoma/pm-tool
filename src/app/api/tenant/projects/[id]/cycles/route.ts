import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { findRolloverSourceCycleId } from "@/tenant/cycles/rollover";

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

  // Rollover: unerledigte Tasks des zuletzt abgelaufenen Cycles wandern automatisch
  // in den neuen Cycle, statt dass sie manuell umgehängt werden müssen (Roadmap #11).
  const priorCycles = await context.tenantDb.cycle.findMany({
    where: { projectId: id, id: { not: cycle.id } },
    select: { id: true, endDate: true },
  });
  const sourceCycleId = findRolloverSourceCycleId(priorCycles, startDate);
  let rolledOverCount = 0;
  if (sourceCycleId) {
    const result = await context.tenantDb.task.updateMany({
      where: { cycleId: sourceCycleId, status: { category: { not: "done" } } },
      data: { cycleId: cycle.id, cycleAssignedAt: startDate },
    });
    rolledOverCount = result.count;
  }

  return NextResponse.json({ cycle, rolledOverCount }, { status: 201 });
}
