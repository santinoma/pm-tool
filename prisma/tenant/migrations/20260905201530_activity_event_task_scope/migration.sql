-- AlterTable ActivityEvent
ALTER TABLE "ActivityEvent" ADD COLUMN "taskId" TEXT;
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
