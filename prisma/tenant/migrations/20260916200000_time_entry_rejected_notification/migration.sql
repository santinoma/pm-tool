-- Adds the activity event type used to notify a submitter that their time
-- entry was rejected ("Änderung angefordert") and needs to be resubmitted.
ALTER TYPE "ActivityEventType" ADD VALUE 'time_entry_rejected';
