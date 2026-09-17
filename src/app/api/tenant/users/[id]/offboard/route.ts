import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers, wouldDeactivateLastOwner } from "@/tenant/auth/roleGuard";
import { recordAuditEntry } from "@/tenant/auditLog/recordAuditEntry";
import { getOwnershipSummary } from "../ownership-summary/route";
import type { PrismaClient, User } from "@/generated/tenant-client/client.js";

export interface OffboardResult {
  user: { id: string; email: string; isActive: boolean };
  reassignedTo: string | null;
  counts: {
    budgetsReassigned: number;
    dealsReassigned: number;
    managedProjectsReassigned: number;
    openTasksReassigned: number;
    projectMembershipsRemoved: number;
    automationRulesReassigned: number;
    resourceBookingsReassigned: number;
    sharedSavedViewsReassigned: number;
    privateSavedViewsDeleted: number;
    savedReportsReassigned: number;
    apiKeysRevoked: number;
    absenceRequestsReassigned: number;
  };
}

export class OffboardValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Core "Offboard user" logic, factored out of the route handler so it is directly
 * testable (see tests/offboarding.test.ts) without going through Next.js request
 * plumbing. Ownership scope and decisions (see also SPEC/CAPABILITY-MAP notes for the
 * offboarding-workflow gap):
 *
 * REASSIGNED-OR-NULLED (active ownership/access, in scope):
 *  - Budget.ownerId (required/non-null) -> reassigned to reassignToUserId; if the
 *    target owns any budgets and no reassignToUserId is given, this is rejected (400)
 *    up front, since the field cannot be nulled.
 *  - Deal.ownerId (required/non-null) -> same as Budget.ownerId. Productive's
 *    documented offboarding flow explicitly reassigns deals where the user is the
 *    owner; this was previously missing entirely, leaving a deactivated user as the
 *    unreachable owner of open deals.
 *  - Project.projectManagerId (nullable) -> reassigned if given, else cleared to null.
 *  - AbsenceRequest.reviewedById (nullable) -> same treatment as
 *    Project.projectManagerId: reassigned if a successor is given, else cleared. Not
 *    treated as a blocker (a past reviewer decision doesn't need an owner going
 *    forward), unlike Budget/Deal ownership above.
 *  - AutomationRule.createdById (required/non-null) -> reassigned to reassignToUserId;
 *    required (400) if the target created any rules and no successor is given. Treated
 *    as ownership (not just audit metadata) because these are live, still-executing
 *    configs someone needs to be responsible for.
 *  - ResourceBooking.createdById (required/non-null) -> same as AutomationRule.createdById.
 *  - SavedView.ownerId: shared views (sharedWithAll: true) are reassigned like the above
 *    (required if any exist and no successor given), since other people rely on them
 *    staying visible/owned. PRIVATE views (sharedWithAll: false) are deleted instead of
 *    reassigned or nulled — they're personal filters nobody else uses, and handing them
 *    to a successor would just dump irrelevant private views on that person.
 *  - SavedReport.ownerId (required/non-null) -> reassigned like Budget/AutomationRule.
 *  - ApiKey -> NOT reassigned (handing a departing employee's API credentials to someone
 *    else is a security anti-pattern). Instead, all of the target's non-revoked keys are
 *    revoked (revokedAt set), same effect as offboarding: the credential stops working.
 *  - Task.assigneeId, but only for tasks whose status is NOT in the "done" category ->
 *    reassigned to reassignToUserId if given, else cleared to null. Already-done tasks
 *    are left untouched (they're historical record, not active ownership).
 *  - ProjectMember rows for the user -> deleted outright (removes project access/
 *    membership; Productive's offboarding flow does this too, not just financial
 *    ownership).
 *
 * DELIBERATELY OUT OF SCOPE (left untouched, documented, not erased):
 *  - TimeEntry, Comment, ActivityEvent, AuditLogEntry and other historical/append-only
 *    records -> never modified or deleted; this is about clearing ACTIVE ownership, not
 *    rewriting history.
 *  - TimesheetLock.lockedById -> left as-is. It records who performed a past lock
 *    action (audit trail of what happened), not an ongoing responsibility -- similar to
 *    Invoice/InvoicePayment/CreditNote.createdById, which are also left untouched.
 *  - ResourceBooking.userId (the person actually booked, as opposed to createdById, who
 *    booked them) -> left untouched. Not in the "at minimum check" list and more akin to
 *    Task.assigneeId-style participation than ownership; a future booking for a
 *    deactivated user is a scheduling problem for a human to resolve, not something to
 *    silently rewrite.
 *  - AutomationAction.targetUserId (a rule's configured action target, e.g. "assign to
 *    user X") -> left untouched; it's a configuration parameter of a rule someone else
 *    may now own (see AutomationRule.createdById above), not the departing user's own
 *    property.
 *  - ProjectRoleOverride, BudgetSectionAssignee, TaskSubscriber, NotificationPreference,
 *    DashboardWidgetPreference and other per-user settings/participation rows -> left
 *    untouched. isActive: false already blocks login, so stale personal settings for a
 *    deactivated user are inert and harmless to leave behind.
 */
export async function runOffboardUser(
  tenantDb: PrismaClient,
  actor: User,
  targetUserId: string,
  reassignToUserId: string | null,
): Promise<OffboardResult> {
  if (reassignToUserId === targetUserId) {
    throw new OffboardValidationError("Übertragung an den zu deaktivierenden Nutzer selbst ist nicht möglich.");
  }

  const target = await tenantDb.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    throw new OffboardValidationError("Mitglied nicht gefunden.", 404);
  }

  let successor: User | null = null;
  if (reassignToUserId) {
    successor = await tenantDb.user.findUnique({ where: { id: reassignToUserId } });
    if (!successor || !successor.isActive) {
      throw new OffboardValidationError("Der Nachfolger muss ein existierender, aktiver Nutzer sein.");
    }
  }

  const allUsers = await tenantDb.user.findMany({ select: { id: true, role: true, isActive: true } });
  if (wouldDeactivateLastOwner(allUsers, targetUserId)) {
    throw new OffboardValidationError("Der letzte aktive Owner kann nicht offboardet werden.", 409);
  }

  const summary = await getOwnershipSummary(tenantDb, targetUserId);

  if (!successor) {
    const blockers: string[] = [];
    if (summary.budgets > 0) blockers.push(`${summary.budgets} Budget(s)`);
    if (summary.deals > 0) blockers.push(`${summary.deals} Deal(s)`);
    if (summary.automationRules > 0) blockers.push(`${summary.automationRules} Automation-Regel(n)`);
    if (summary.resourceBookings > 0) blockers.push(`${summary.resourceBookings} Ressourcen-Buchung(en)`);
    if (summary.sharedSavedViews > 0) blockers.push(`${summary.sharedSavedViews} geteilte Ansicht(en)`);
    if (summary.savedReports > 0) blockers.push(`${summary.savedReports} gespeicherte(r) Report(s)`);
    if (blockers.length > 0) {
      throw new OffboardValidationError(
        `Ohne Nachfolger kann nicht offboardet werden — dieser Nutzer besitzt noch: ${blockers.join(", ")}.`,
      );
    }
  }

  const result = await tenantDb.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: targetUserId },
      data: { isActive: false },
    });

    // These fields are non-nullable in the schema (Budget.ownerId, AutomationRule.createdById,
    // ResourceBooking.createdById, SavedReport.ownerId, and shared SavedView.ownerId). We already
    // rejected the request up front (400) if the target owns any of these without a successor, so
    // `successor` is guaranteed non-null here whenever a matching row could exist — but we still
    // guard with `successor ? ... : { count: 0 }` rather than a non-null assertion, since asserting
    // would throw on `.id` access even in the (impossible-by-validation, but let's not crash) case
    // where it doesn't hold.
    const budgetsReassignedResult = successor
      ? await tx.budget.updateMany({ where: { ownerId: targetUserId }, data: { ownerId: successor.id } })
      : { count: 0 };

    const dealsReassignedResult = successor
      ? await tx.deal.updateMany({ where: { ownerId: targetUserId }, data: { ownerId: successor.id } })
      : { count: 0 };

    const managedProjectsReassignedResult = await tx.project.updateMany({
      where: { projectManagerId: targetUserId },
      data: { projectManagerId: successor ? successor.id : null },
    });

    const absenceRequestsReassignedResult = await tx.absenceRequest.updateMany({
      where: { reviewedById: targetUserId },
      data: { reviewedById: successor ? successor.id : null },
    });

    const automationRulesReassignedResult = successor
      ? await tx.automationRule.updateMany({ where: { createdById: targetUserId }, data: { createdById: successor.id } })
      : { count: 0 };

    const resourceBookingsReassignedResult = successor
      ? await tx.resourceBooking.updateMany({ where: { createdById: targetUserId }, data: { createdById: successor.id } })
      : { count: 0 };

    const sharedSavedViewsReassignedResult = successor
      ? await tx.savedView.updateMany({
          where: { ownerId: targetUserId, sharedWithAll: true },
          data: { ownerId: successor.id },
        })
      : { count: 0 };

    const privateSavedViewsDeletedResult = await tx.savedView.deleteMany({
      where: { ownerId: targetUserId, sharedWithAll: false },
    });

    const savedReportsReassignedResult = successor
      ? await tx.savedReport.updateMany({ where: { ownerId: targetUserId }, data: { ownerId: successor.id } })
      : { count: 0 };

    const apiKeysRevokedResult = await tx.apiKey.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const openTasksReassignedResult = await tx.task.updateMany({
      where: { assigneeId: targetUserId, status: { category: { not: "done" } } },
      data: { assigneeId: successor ? successor.id : null },
    });

    const projectMembershipsRemovedResult = await tx.projectMember.deleteMany({
      where: { userId: targetUserId },
    });

    return {
      updatedUser,
      counts: {
        budgetsReassigned: budgetsReassignedResult.count,
        dealsReassigned: dealsReassignedResult.count,
        managedProjectsReassigned: managedProjectsReassignedResult.count,
        openTasksReassigned: openTasksReassignedResult.count,
        projectMembershipsRemoved: projectMembershipsRemovedResult.count,
        automationRulesReassigned: automationRulesReassignedResult.count,
        resourceBookingsReassigned: resourceBookingsReassignedResult.count,
        sharedSavedViewsReassigned: sharedSavedViewsReassignedResult.count,
        privateSavedViewsDeleted: privateSavedViewsDeletedResult.count,
        savedReportsReassigned: savedReportsReassignedResult.count,
        apiKeysRevoked: apiKeysRevokedResult.count,
        absenceRequestsReassigned: absenceRequestsReassignedResult.count,
      },
    };
  });

  const summaryParts = Object.entries(result.counts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${key}: ${count}`);
  const summaryText =
    summaryParts.length > 0 ? summaryParts.join(", ") : "keine Ownership-Felder betroffen";

  try {
    await recordAuditEntry(tenantDb, {
      actorId: actor.id,
      action: "user_offboarded",
      entityType: "User",
      entityId: targetUserId,
      summary: successor
        ? `${target.email} offboardet, Ownership übertragen an ${successor.email} (${summaryText})`
        : `${target.email} offboardet, Ownership geleert/entfernt (${summaryText})`,
    });
  } catch {
    // Audit-Logging darf die eigentliche Aktion nie blockieren.
  }

  return {
    user: { id: result.updatedUser.id, email: result.updatedUser.email, isActive: result.updatedUser.isActive },
    reassignedTo: successor?.id ?? null,
    counts: result.counts,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  if (id === context.currentUser.id) {
    return NextResponse.json({ error: "Du kannst dich nicht selbst offboarden." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const reassignToUserId =
    typeof body?.reassignToUserId === "string" && body.reassignToUserId.length > 0
      ? body.reassignToUserId
      : null;

  try {
    const result = await runOffboardUser(context.tenantDb, context.currentUser, id, reassignToUserId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OffboardValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
