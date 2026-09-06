import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import type { PrismaClient } from "@/generated/tenant-client/client.js";

export interface OwnershipSummary {
  budgets: number;
  managedProjects: number;
  openTasks: number;
  projectMemberships: number;
  automationRules: number;
  resourceBookings: number;
  sharedSavedViews: number;
  privateSavedViews: number;
  savedReports: number;
  apiKeys: number;
}

/**
 * Counts everything a user currently owns/is assigned that an "Offboard user"
 * action would need to touch. Factored out of the route handler so it's
 * directly testable (see tests/offboarding.test.ts) and reusable by the
 * offboard endpoint's own up-front validation.
 */
export async function getOwnershipSummary(tenantDb: PrismaClient, userId: string): Promise<OwnershipSummary> {
  const [
    budgets,
    managedProjects,
    openTasks,
    projectMemberships,
    automationRules,
    resourceBookings,
    sharedSavedViews,
    privateSavedViews,
    savedReports,
    apiKeys,
  ] = await Promise.all([
    tenantDb.budget.count({ where: { ownerId: userId } }),
    tenantDb.project.count({ where: { projectManagerId: userId } }),
    tenantDb.task.count({ where: { assigneeId: userId, status: { category: { not: "done" } } } }),
    tenantDb.projectMember.count({ where: { userId } }),
    tenantDb.automationRule.count({ where: { createdById: userId } }),
    tenantDb.resourceBooking.count({ where: { createdById: userId } }),
    tenantDb.savedView.count({ where: { ownerId: userId, sharedWithAll: true } }),
    tenantDb.savedView.count({ where: { ownerId: userId, sharedWithAll: false } }),
    tenantDb.savedReport.count({ where: { ownerId: userId } }),
    tenantDb.apiKey.count({ where: { userId, revokedAt: null } }),
  ]);

  return {
    budgets,
    managedProjects,
    openTasks,
    projectMemberships,
    automationRules,
    resourceBookings,
    sharedSavedViews,
    privateSavedViews,
    savedReports,
    apiKeys,
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const target = await context.tenantDb.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ error: "Mitglied nicht gefunden." }, { status: 404 });
  }

  const summary = await getOwnershipSummary(context.tenantDb, id);
  return NextResponse.json({ summary });
}
