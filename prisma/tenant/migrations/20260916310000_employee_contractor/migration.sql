-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('employee', 'contractor');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "employmentType" "EmploymentType" NOT NULL DEFAULT 'employee';

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN "employmentType" "EmploymentType" NOT NULL DEFAULT 'employee';
