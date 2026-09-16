-- Add the missing "Timesheet Submission" layer that precedes Approval in
-- Productive's real flow: entries start as a Draft (submittedAt null) and
-- must be explicitly submitted — individually or as a weekly batch action —
-- before a manager can see and act on them, distinct from Approved/Rejected.
--
-- Existing entries are backfilled with submittedAt = createdAt so they stay
-- visible in the Approvals inbox exactly as before; only entries created
-- going forward start as drafts.

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN "submittedAt" TIMESTAMP(3);

-- Backfill: preserve current Approvals-inbox visibility for existing data
UPDATE "TimeEntry" SET "submittedAt" = "createdAt";

-- CreateIndex
CREATE INDEX "TimeEntry_submittedAt_idx" ON "TimeEntry"("submittedAt");
