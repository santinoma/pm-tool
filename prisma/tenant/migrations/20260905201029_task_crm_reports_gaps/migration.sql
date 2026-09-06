-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('no_priority', 'low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "TaskTShirtSize" AS ENUM ('XS', 'S', 'M', 'L', 'XL');

-- AlterTable Task
ALTER TABLE "Task" ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'no_priority';
ALTER TABLE "Task" ADD COLUMN "tShirtSize" "TaskTShirtSize";

-- AlterEnum CustomFieldType (add url, percent)
ALTER TYPE "CustomFieldType" ADD VALUE 'url';
ALTER TYPE "CustomFieldType" ADD VALUE 'percent';

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('customer', 'supplier', 'partner', 'internal', 'recruitment');

-- AlterTable Client
ALTER TABLE "Client" ADD COLUMN "type" "ClientType";
ALTER TABLE "Client" ADD COLUMN "accountOwnerId" TEXT;
ALTER TABLE "Client" ADD COLUMN "paymentTermsDays" INTEGER;
ALTER TABLE "Client" ADD CONSTRAINT "Client_accountOwnerId_fkey" FOREIGN KEY ("accountOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable ClientContact
ALTER TABLE "ClientContact" ADD COLUMN "title" TEXT;

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('lead', 'qualified', 'proposal', 'won', 'lost');

-- CreateTable Deal
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stage" "DealStage" NOT NULL DEFAULT 'lead',
    "ownerId" TEXT NOT NULL,
    "estimatedValue" DOUBLE PRECISION,
    "probability" INTEGER,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable SavedReport
ALTER TABLE "SavedReport" ADD COLUMN "category" TEXT;
