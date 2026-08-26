-- CreateEnum
CREATE TYPE "RecurrenceInterval" AS ENUM ('weekly', 'monthly');

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "isRetainer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurrenceInterval" "RecurrenceInterval";
