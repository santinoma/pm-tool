-- AlterTable User: language is per-member again, not tenant-wide
ALTER TABLE "User" ADD COLUMN "locale" "Locale" NOT NULL DEFAULT 'de';

-- AlterTable TenantSettings: drop the tenant-wide override
ALTER TABLE "TenantSettings" DROP COLUMN "locale";
