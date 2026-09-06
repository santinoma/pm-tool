-- AlterTable TenantSettings: language becomes a tenant-wide setting
ALTER TABLE "TenantSettings" ADD COLUMN "locale" "Locale" NOT NULL DEFAULT 'de';

-- AlterTable User: drop the per-user locale override, superseded by TenantSettings.locale
ALTER TABLE "User" DROP COLUMN "locale";
