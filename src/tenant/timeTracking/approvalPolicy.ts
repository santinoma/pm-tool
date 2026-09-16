import type { PrismaClient, ApprovalMode, ApproverRoleType, ApprovalDecisionStatus } from "@/generated/tenant-client/client.js";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export interface ApproverConfig {
  roleType: ApproverRoleType;
  specificUserId: string | null;
}

export interface ApproverResolutionContext {
  budgetOwnerId: string;
  projectManagerId: string | null;
  submitterManagerId: string | null;
}

/**
 * Resolves the abstract approver roles from a policy (budget owner, project
 * manager, submitter's manager, or a specific person) into concrete user ids
 * for one time entry. A manager-role approver falls back to the budget owner
 * when the submitter has no manager assigned, matching Productive's real
 * behavior for that case.
 */
export function resolveApproverUserIds(approvers: ApproverConfig[], context: ApproverResolutionContext): string[] {
  const ids = new Set<string>();
  for (const approver of approvers) {
    switch (approver.roleType) {
      case "budget_owner":
        ids.add(context.budgetOwnerId);
        break;
      case "project_manager":
        if (context.projectManagerId) ids.add(context.projectManagerId);
        break;
      case "submitter_manager":
        ids.add(context.submitterManagerId ?? context.budgetOwnerId);
        break;
      case "specific_person":
        if (approver.specificUserId) ids.add(approver.specificUserId);
        break;
    }
  }
  return Array.from(ids);
}

/**
 * Given every resolved approver's individual decision, what should the time
 * entry's overall approvalStatus be? A single rejection is decisive
 * regardless of mode; otherwise "any" needs one approval and "all" needs
 * every approver to approve.
 */
export function computeOverallStatus(
  decisions: { status: ApprovalDecisionStatus }[],
  mode: ApprovalMode,
): "pending" | "approved" | "rejected" {
  if (decisions.some((decision) => decision.status === "rejected")) return "rejected";
  if (decisions.length === 0) return "pending";
  if (mode === "all") {
    return decisions.every((decision) => decision.status === "approved") ? "approved" : "pending";
  }
  return decisions.some((decision) => decision.status === "approved") ? "approved" : "pending";
}

interface ApprovalContext {
  policyId: string;
  mode: ApprovalMode;
  approverUserIds: string[];
}

/**
 * Loads the time entry's budget approval policy (if any) and resolves it
 * into concrete approver ids for the "time" kind. Returns null when the
 * entry has no budget section, or its budget has no policy assigned — in
 * both cases the caller should fall back to today's behavior (any owner/
 * admin can approve, single decision).
 */
export async function resolveTimeApprovalContext(tenantDb: PrismaClient, timeEntryId: string): Promise<ApprovalContext | null> {
  const entry = await tenantDb.timeEntry.findUnique({
    where: { id: timeEntryId },
    include: {
      user: { select: { managerId: true } },
      budgetSection: {
        include: {
          budget: {
            include: {
              approvalPolicy: { include: { approvers: true } },
              project: { select: { projectManagerId: true } },
            },
          },
        },
      },
    },
  });
  const budget = entry?.budgetSection?.budget;
  const policy = budget?.approvalPolicy;
  if (!entry || !budget || !policy) return null;

  const timeApprovers = policy.approvers.filter((approver) => approver.kind === "time");
  const approverUserIds = resolveApproverUserIds(timeApprovers, {
    budgetOwnerId: budget.ownerId,
    projectManagerId: budget.project.projectManagerId,
    submitterManagerId: entry.user.managerId,
  });
  return { policyId: policy.id, mode: policy.timeApprovalMode, approverUserIds };
}

/** Idempotently creates one pending decision row per resolved approver. */
export async function ensureApproverDecisions(tenantDb: PrismaClient, timeEntryId: string, approverUserIds: string[]): Promise<void> {
  if (approverUserIds.length === 0) return;
  await tenantDb.timeEntryApproverDecision.createMany({
    data: approverUserIds.map((approverId) => ({ timeEntryId, approverId })),
    skipDuplicates: true,
  });
}

export interface RecordDecisionResult {
  ok: boolean;
  error?: string;
  status?: number;
}

/**
 * The shared core of the approve/reject routes. Handles both the legacy
 * "no policy on this budget" path (unchanged: any owner/admin can decide,
 * single approvedById/approvedAt) and the policy-driven path (per-approver
 * decisions, resolved into an overall status per computeOverallStatus).
 * Admins/owners can always act on behalf of the assigned approvers —
 * mirrors Productive's "Approve all time entries" permission fallback,
 * ensuring continuity when a designated approver is unavailable.
 */
export async function recordApprovalDecision(
  tenantDb: PrismaClient,
  timeEntryId: string,
  actingUser: { id: string; role: "owner" | "admin" | "member" | "client" },
  decision: "approved" | "rejected",
): Promise<RecordDecisionResult> {
  const isPrivileged = canManageMembers(actingUser.role);
  const context = await resolveTimeApprovalContext(tenantDb, timeEntryId);

  if (!context || context.mode === "none") {
    // Legacy / no-policy path: only owners/admins may decide (unchanged behavior).
    if (!isPrivileged) return { ok: false, error: "Keine Berechtigung.", status: 403 };
    await tenantDb.timeEntry.update({
      where: { id: timeEntryId },
      data: { approvalStatus: decision, approvedById: actingUser.id, approvedAt: new Date() },
    });
    return { ok: true };
  }

  const isAssignedApprover = context.approverUserIds.includes(actingUser.id);
  if (!isAssignedApprover && !isPrivileged) {
    return { ok: false, error: "Du bist kein zugewiesener Approver für diesen Eintrag.", status: 403 };
  }

  await ensureApproverDecisions(tenantDb, timeEntryId, context.approverUserIds);

  const decidedAt = new Date();
  if (isAssignedApprover) {
    await tenantDb.timeEntryApproverDecision.update({
      where: { timeEntryId_approverId: { timeEntryId, approverId: actingUser.id } },
      data: { status: decision, decidedAt },
    });
  } else {
    // Admin override on behalf of every still-pending approver ("Approve for all approvers").
    await tenantDb.timeEntryApproverDecision.updateMany({
      where: { timeEntryId, status: "pending" },
      data: { status: decision, decidedAt },
    });
  }

  const decisions = await tenantDb.timeEntryApproverDecision.findMany({ where: { timeEntryId } });
  const overallStatus = computeOverallStatus(decisions, context.mode);
  if (overallStatus !== "pending") {
    await tenantDb.timeEntry.update({
      where: { id: timeEntryId },
      data: { approvalStatus: overallStatus, approvedById: actingUser.id, approvedAt: decidedAt },
    });
  }
  return { ok: true };
}
