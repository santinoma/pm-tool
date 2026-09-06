import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { resolveProjectIdForBudget } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { recordActivity } from "@/tenant/notifications/recordActivity";

/**
 * Markiert ein Budget als geliefert. Sobald ein Budget geliefert ist, sind
 * keine weiteren Zeit-/Ausgabenbuchungen gegen seine Sections mehr möglich
 * (siehe time-entries-Route) — unabhängig vom trackTime-Flag der jeweiligen
 * Section.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (!canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const budget = await context.tenantDb.budget.findUnique({ where: { id } });
  if (!budget) {
    return NextResponse.json({ error: "Budget nicht gefunden." }, { status: 404 });
  }
  if (budget.deliveredAt) {
    return NextResponse.json({ error: "Budget bereits geliefert." }, { status: 409 });
  }

  const updated = await context.tenantDb.budget.update({
    where: { id },
    data: { deliveredAt: new Date() },
  });

  await recordActivity(context.tenantDb, {
    projectId: updated.projectId,
    actorId: context.currentUser.id,
    type: "budget_updated",
    summary: `Budget "${updated.title}" wurde geliefert.`,
    budgetId: updated.id,
  });

  return NextResponse.json({ budget: updated });
}
