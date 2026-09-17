-- Productive.io "Settings > General": Location & Format, Work Time, and
-- Fiscal Year — previously entirely absent from TenantSettings.

CREATE TYPE "TimeFormat" AS ENUM ('h12', 'h24');
CREATE TYPE "DateFormat" AS ENUM ('dd_mm_yyyy', 'mm_dd_yyyy', 'yyyy_mm_dd');
CREATE TYPE "NumberFormat" AS ENUM ('comma_decimal', 'period_decimal');

ALTER TABLE "TenantSettings" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'Europe/Berlin';
ALTER TABLE "TenantSettings" ADD COLUMN "timeFormat" "TimeFormat" NOT NULL DEFAULT 'h24';
ALTER TABLE "TenantSettings" ADD COLUMN "dateFormat" "DateFormat" NOT NULL DEFAULT 'dd_mm_yyyy';
ALTER TABLE "TenantSettings" ADD COLUMN "numberFormat" "NumberFormat" NOT NULL DEFAULT 'comma_decimal';

ALTER TABLE "TenantSettings" ADD COLUMN "weekStartDay" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TenantSettings" ADD COLUMN "workingDays" INTEGER[] DEFAULT ARRAY[1,2,3,4,5]::INTEGER[];
ALTER TABLE "TenantSettings" ADD COLUMN "personDayHours" DOUBLE PRECISION NOT NULL DEFAULT 8;

ALTER TABLE "TenantSettings" ADD COLUMN "fiscalYearEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantSettings" ADD COLUMN "fiscalYearStartMonth" INTEGER NOT NULL DEFAULT 1;
