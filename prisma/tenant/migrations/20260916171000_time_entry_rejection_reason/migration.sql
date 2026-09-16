-- Persist why a time entry was rejected ("Requesting Changes to Time
-- Entries" in Productive), so the submitter sees the reason and can fix and
-- resubmit — previously rejections carried no reason at all.

ALTER TABLE "TimeEntry" ADD COLUMN "rejectionReason" TEXT;
