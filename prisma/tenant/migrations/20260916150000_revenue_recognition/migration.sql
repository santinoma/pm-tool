-- Track revenue recognition separately from invoiced amount, matching
-- Productive's real model: a Fixed-price service can spread its revenue
-- evenly across the budget's date range instead of recognizing it all at
-- once when invoiced. Purely additive — every existing section defaults to
-- "immediate" (recognized == invoiced, today's behavior unchanged).

-- CreateEnum
CREATE TYPE "RevenueRecognitionMethod" AS ENUM ('immediate', 'straight_line');

-- AlterTable
ALTER TABLE "BudgetSection" ADD COLUMN "recognitionMethod" "RevenueRecognitionMethod" NOT NULL DEFAULT 'immediate';
