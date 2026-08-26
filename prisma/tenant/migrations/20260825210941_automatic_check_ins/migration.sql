-- CreateEnum
CREATE TYPE "CheckInRecurrence" AS ENUM ('daily', 'weekly');

-- CreateTable
CREATE TABLE "CheckInSchedule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "recurrence" "CheckInRecurrence" NOT NULL,
    "dayOfWeek" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInResponse" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckInResponse_scheduleId_userId_periodKey_key" ON "CheckInResponse"("scheduleId", "userId", "periodKey");

-- AddForeignKey
ALTER TABLE "CheckInSchedule" ADD CONSTRAINT "CheckInSchedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInResponse" ADD CONSTRAINT "CheckInResponse_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "CheckInSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInResponse" ADD CONSTRAINT "CheckInResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
