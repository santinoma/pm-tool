-- CreateEnum
CREATE TYPE "CostRateType" AS ENUM ('hourly', 'weekly', 'biweekly', 'monthly', 'annual');

-- CreateTable
CREATE TABLE "CostRateHistoryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rateType" "CostRateType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "workHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "CostRateHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CostRateHistoryEntry" ADD CONSTRAINT "CostRateHistoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostRateHistoryEntry" ADD CONSTRAINT "CostRateHistoryEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
