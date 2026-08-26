-- CreateEnum
CREATE TYPE "TenantTier" AS ENUM ('shared', 'dedicated');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "tier" "TenantTier" NOT NULL DEFAULT 'shared';
