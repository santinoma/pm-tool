import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { computeCycleInsights } from "@/tenant/cycles/cycleInsights";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const cycle = await context.tenantDb.cycle.findUnique({
    where: { id },
    include: { tasks: { include: { status: true, assignee: true } } },
  });
  if (!cycle) {
    return NextResponse.json({ error: "Cycle nicht gefunden." }, { status: 404 });
  }

  const insights = computeCycleInsights(
    cycle.tasks.map((task) => ({
      statusCategory: task.status.category,
      estimatedHours: task.estimatedHours,
      cycleAssignedAt: task.cycleAssignedAt,
    })),
    cycle.startDate,
  );

  return NextResponse.json({ cycle, insights });
}
