import type { PrismaClient } from "@/generated/tenant-client/client.js";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";

export interface InitialTimeEntryState {
  submittedAt: Date | null;
  approvalStatus: "pending" | "approved";
  approvedAt: Date | null;
}

/**
 * Determines how a newly-logged (complete) time entry should start out,
 * matching Productive's real default: the manual "Submit Timesheet" step is
 * a separate, opt-in feature that adds structure on top of approval — it
 * does not gate it. So by default, a finished entry auto-submits straight
 * into the approval queue the moment it's created. If org-wide Time
 * Approval is off entirely, entries need no review at all and are
 * auto-approved on the spot. Only when Time Entry Submission is explicitly
 * enabled does an entry start as an unsubmitted Draft.
 */
export async function resolveInitialTimeEntryState(tenantDb: PrismaClient, now: Date = new Date()): Promise<InitialTimeEntryState> {
  const settings = await getOrCreateTenantSettings(tenantDb);

  if (!settings.timeApprovalEnabled) {
    return { submittedAt: now, approvalStatus: "approved", approvedAt: now };
  }
  if (settings.timeEntrySubmissionEnabled) {
    return { submittedAt: null, approvalStatus: "pending", approvedAt: null };
  }
  return { submittedAt: now, approvalStatus: "pending", approvedAt: null };
}
