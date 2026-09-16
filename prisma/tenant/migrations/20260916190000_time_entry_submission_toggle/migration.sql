-- Correction: per Productive's "Setting Up Time Entry Submissions" doc, the
-- manual Submit-Timesheet step is a separate, Ultimate-plan opt-in feature
-- that "adds an extra step ... but does not replace existing Time Approval
-- settings". By default (this flag off), entries must auto-submit into the
-- approval queue the moment they're created — that's the behavior the
-- earlier Submission migration incorrectly made mandatory for everyone.

ALTER TABLE "TenantSettings" ADD COLUMN "timeEntrySubmissionEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: entries logged while Submission was incorrectly mandatory (still
-- a Draft, never manually submitted) now auto-submit into the approval
-- queue, matching the corrected default behavior. Running timers
-- (durationMinutes still null) are left untouched — they aren't "logged" yet.
UPDATE "TimeEntry" SET "submittedAt" = "createdAt" WHERE "submittedAt" IS NULL AND "durationMinutes" IS NOT NULL;
