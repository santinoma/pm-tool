/*
  Warnings:

  - You are about to drop the column `trigger` on the `AutomationRule` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutomationActionType" ADD VALUE 'change_status';
ALTER TYPE "AutomationActionType" ADD VALUE 'add_comment';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutomationTrigger" ADD VALUE 'task_updated';
ALTER TYPE "AutomationTrigger" ADD VALUE 'task_commented';
ALTER TYPE "AutomationTrigger" ADD VALUE 'time_daily';
ALTER TYPE "AutomationTrigger" ADD VALUE 'time_weekly';

-- DropForeignKey
ALTER TABLE "AutomationAction" DROP CONSTRAINT "AutomationAction_targetUserId_fkey";

-- AlterTable
ALTER TABLE "AutomationAction" ADD COLUMN     "commentBody" TEXT,
ADD COLUMN     "targetStatusId" TEXT,
ALTER COLUMN "targetUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AutomationRule" DROP COLUMN "trigger",
ADD COLUMN     "lastRunPeriodKey" TEXT,
ADD COLUMN     "scheduleTime" TEXT,
ADD COLUMN     "scheduleWeekday" INTEGER,
ADD COLUMN     "triggers" "AutomationTrigger"[];

-- AddForeignKey
ALTER TABLE "AutomationAction" ADD CONSTRAINT "AutomationAction_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAction" ADD CONSTRAINT "AutomationAction_targetStatusId_fkey" FOREIGN KEY ("targetStatusId") REFERENCES "WorkflowStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
