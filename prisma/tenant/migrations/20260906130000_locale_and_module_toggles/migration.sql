-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('de', 'en');

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "locale" "Locale" NOT NULL DEFAULT 'de';

-- AlterTable TenantSettings
ALTER TABLE "TenantSettings" ADD COLUMN "crmEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TenantSettings" ADD COLUMN "reportsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TenantSettings" ADD COLUMN "resourcingEnabled" BOOLEAN NOT NULL DEFAULT true;
