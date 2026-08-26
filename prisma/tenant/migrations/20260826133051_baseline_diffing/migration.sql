-- CreateTable
CREATE TABLE "Baseline" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Baseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaselineTaskSnapshot" (
    "id" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "estimatedHours" DOUBLE PRECISION,
    "statusCategory" "StatusCategory" NOT NULL,

    CONSTRAINT "BaselineTaskSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaselineTaskSnapshot_baselineId_taskId_key" ON "BaselineTaskSnapshot"("baselineId", "taskId");

-- AddForeignKey
ALTER TABLE "Baseline" ADD CONSTRAINT "Baseline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaselineTaskSnapshot" ADD CONSTRAINT "BaselineTaskSnapshot_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "Baseline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
