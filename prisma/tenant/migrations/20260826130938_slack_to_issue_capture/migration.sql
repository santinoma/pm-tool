-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "externalSourceUrl" TEXT;

-- CreateTable
CREATE TABLE "SlackCaptureConfig" (
    "id" TEXT NOT NULL,
    "signingSecret" TEXT NOT NULL,
    "defaultProjectId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackCaptureConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SlackCaptureConfig" ADD CONSTRAINT "SlackCaptureConfig_defaultProjectId_fkey" FOREIGN KEY ("defaultProjectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
