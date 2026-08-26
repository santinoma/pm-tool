-- CreateTable
CREATE TABLE "TransitionRule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromStatusId" TEXT,
    "toStatusId" TEXT NOT NULL,
    "requiredFieldKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransitionRule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TransitionRule" ADD CONSTRAINT "TransitionRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitionRule" ADD CONSTRAINT "TransitionRule_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "WorkflowStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitionRule" ADD CONSTRAINT "TransitionRule_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "WorkflowStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
