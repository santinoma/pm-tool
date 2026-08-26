-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "estimatedHours" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "weeklyCapacityHours" DOUBLE PRECISION NOT NULL DEFAULT 40;
