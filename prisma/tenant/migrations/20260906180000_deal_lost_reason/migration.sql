-- AlterTable Deal: capture why a deal was lost, matching Productive's required lost_reason
ALTER TABLE "Deal" ADD COLUMN "lostReason" TEXT;
