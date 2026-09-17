-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN "financialMonthClosingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantSettings" ADD COLUMN "financialMonthClosingDay" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "FinancialPeriodLock" (
    "id" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL,
    "lockedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialPeriodLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPeriodLock_periodKey_key" ON "FinancialPeriodLock"("periodKey");

-- AddForeignKey
ALTER TABLE "FinancialPeriodLock" ADD CONSTRAINT "FinancialPeriodLock_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
