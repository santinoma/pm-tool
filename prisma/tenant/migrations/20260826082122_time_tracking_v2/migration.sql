-- CreateEnum
CREATE TYPE "TimeTrackingMode" AS ENUM ('timer', 'entries');

-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "timeTrackingMode" "TimeTrackingMode" NOT NULL DEFAULT 'timer';

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "budgetSectionId" TEXT;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_budgetSectionId_fkey" FOREIGN KEY ("budgetSectionId") REFERENCES "BudgetSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
