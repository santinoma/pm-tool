-- CreateEnum
CREATE TYPE "CustomFieldEntityType" AS ENUM ('task', 'budget');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('fixed', 'time_and_materials', 'non_billable', 'percentage');

-- CreateEnum
CREATE TYPE "TrackingUnit" AS ENUM ('hours', 'days', 'piece');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CustomFieldType" ADD VALUE 'multi_select';
ALTER TYPE "CustomFieldType" ADD VALUE 'person';

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "color" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BudgetSection" ADD COLUMN     "billingType" "BillingType" NOT NULL DEFAULT 'time_and_materials',
ADD COLUMN     "blockOverrun" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "discountPercent" DOUBLE PRECISION,
ADD COLUMN     "guaranteedMaxPrice" DOUBLE PRECISION,
ADD COLUMN     "markupPercent" DOUBLE PRECISION,
ADD COLUMN     "serviceTypeId" TEXT,
ADD COLUMN     "trackingUnit" "TrackingUnit" NOT NULL DEFAULT 'hours';

-- AlterTable
ALTER TABLE "CustomFieldDef" ADD COLUMN     "entityType" "CustomFieldEntityType" NOT NULL DEFAULT 'task';

-- CreateTable
CREATE TABLE "BudgetCustomFieldValue" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "BudgetCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCustomFieldValue_fieldId_budgetId_key" ON "BudgetCustomFieldValue"("fieldId", "budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_name_key" ON "ServiceType"("name");

-- AddForeignKey
ALTER TABLE "BudgetCustomFieldValue" ADD CONSTRAINT "BudgetCustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomFieldDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCustomFieldValue" ADD CONSTRAINT "BudgetCustomFieldValue_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSection" ADD CONSTRAINT "BudgetSection_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
