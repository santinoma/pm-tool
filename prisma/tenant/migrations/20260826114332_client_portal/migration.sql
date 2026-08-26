-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'client';

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "grantedProjectIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ProjectClientAccess" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ProjectClientAccess_pkey" PRIMARY KEY ("projectId","userId")
);

-- AddForeignKey
ALTER TABLE "ProjectClientAccess" ADD CONSTRAINT "ProjectClientAccess_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectClientAccess" ADD CONSTRAINT "ProjectClientAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
