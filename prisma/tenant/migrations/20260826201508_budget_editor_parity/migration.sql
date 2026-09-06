-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityEventType" ADD VALUE 'budget_created';
ALTER TYPE "ActivityEventType" ADD VALUE 'budget_updated';
ALTER TYPE "ActivityEventType" ADD VALUE 'budget_section_added';
ALTER TYPE "ActivityEventType" ADD VALUE 'budget_section_updated';
ALTER TYPE "ActivityEventType" ADD VALUE 'budget_section_removed';
ALTER TYPE "ActivityEventType" ADD VALUE 'invoice_created';

-- AlterTable
ALTER TABLE "ActivityEvent" ADD COLUMN     "budgetId" TEXT;

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "isScenario" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scenarioOfId" TEXT;

-- AlterTable
ALTER TABLE "BudgetSection" ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimatedCost" DOUBLE PRECISION,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trackBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trackExpenses" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trackTime" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "RateCardItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceTypeId" TEXT,
    "billingType" "BillingType" NOT NULL DEFAULT 'time_and_materials',
    "trackingUnit" "TrackingUnit" NOT NULL DEFAULT 'hours',
    "defaultPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateCardItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_scenarioOfId_fkey" FOREIGN KEY ("scenarioOfId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCardItem" ADD CONSTRAINT "RateCardItem_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
