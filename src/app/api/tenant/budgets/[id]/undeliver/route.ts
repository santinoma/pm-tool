import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { resolveProjectIdForBudget } from "@/tenant/projectAccess/resolveProjectMembership";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";
import { recordActivity } from "@/tenant/notifications/recordActivity";

/**
 * Nimmt die "Lieferung" eines Budgets zurück (analog zu Productive.io's
 * "un-deliver") — nützlich, wenn ein Budget versehentlich als geliefert
 * markiert wurde. Öffnet Buchungen gegen seine Sections wieder.
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
  if (!budget.deliveredAt) {
    return NextResponse.json({ error: "Budget ist nicht geliefert." }, { status: 409 });
  }

  const updated = await context.tenantDb.budget.update({
    where: { id },
    data: { deliveredAt: null },
  });

  await recordActivity(context.tenantDb, {
    projectId: updated.projectId,
    actorId: context.currentUser.id,
    type: "budget_updated",
    summary: `Lieferung von Budget "${updated.title}" wurde zurückgenommen.`,
    budgetId: updated.id,
  });

  return NextResponse.json({ budget: updated });
}
