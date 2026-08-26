-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "budgetAmount" DOUBLE PRECISION,
ADD COLUMN     "budgetHours" DOUBLE PRECISION,
ADD COLUMN     "hourlyRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR';
