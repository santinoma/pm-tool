-- CreateEnum
CREATE TYPE "BillableRateStrategy" AS ENUM ('person', 'service', 'single', 'no_rate');

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN "billableRateStrategy" "BillableRateStrategy" NOT NULL DEFAULT 'service';
ALTER TABLE "Budget" ADD COLUMN "billableRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "BudgetSectionAssignee" ADD COLUMN "hourlyRate" DOUBLE PRECISION;
