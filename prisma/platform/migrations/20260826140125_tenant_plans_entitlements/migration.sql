-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('small', 'medium', 'enterprise');

-- AlterEnum
ALTER TYPE "TenantStatus" ADD VALUE 'disabled';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "addOnFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "plan" "TenantPlan" NOT NULL DEFAULT 'small';
