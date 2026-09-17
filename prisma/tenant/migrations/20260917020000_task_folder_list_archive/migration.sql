-- AlterTable
ALTER TABLE "TaskFolder" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TaskListGroup" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
