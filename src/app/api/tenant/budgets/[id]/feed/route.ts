import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { resolveProjectIdForBudget } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const denied = await assertSingleProjectAccess(
    context.tenantDb,
    context.currentUser,
    await resolveProjectIdForBudget(context.tenantDb, id),
  );
  if (denied) return denied;

  const events = await context.tenantDb.activityEvent.findMany({
    where: { budgetId: id },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      summary: event.summary,
      actorLabel: event.actor.name ?? event.actor.email,
      createdAt: event.createdAt.toISOString(),
    })),
  });
}
