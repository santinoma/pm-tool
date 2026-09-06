-- CreateEnum
CREATE TYPE "ApiKeyScope" AS ENUM ('read_only', 'read_write');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutomationActionType" ADD VALUE 'create_task';
ALTER TYPE "AutomationActionType" ADD VALUE 'create_subtask';
ALTER TYPE "AutomationActionType" ADD VALUE 'create_todo';
ALTER TYPE "AutomationActionType" ADD VALUE 'send_email';

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "scope" "ApiKeyScope" NOT NULL DEFAULT 'read_write';

-- AlterTable
ALTER TABLE "AutomationAction" ADD COLUMN     "newItemTitle" TEXT;

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "projectIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
