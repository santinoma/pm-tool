-- Allow CustomFieldDef to be a reusable "library" field shared across many
-- projects instead of owned by exactly one project, mirroring the
-- Workflow/Pipeline/RateCard "centralize as a shared, reusable entity"
-- pattern. Purely additive: every existing field keeps its single-project
-- ownership (library=false, projectId unchanged) so nothing changes for
-- existing data.

-- AlterTable: projectId becomes optional, add the library flag
ALTER TABLE "CustomFieldDef" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "CustomFieldDef" ADD COLUMN "library" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: join table for a library field attached to a project
CREATE TABLE "ProjectCustomField" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCustomField_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProjectCustomField" ADD CONSTRAINT "ProjectCustomField_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectCustomField" ADD CONSTRAINT "ProjectCustomField_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomFieldDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCustomField_projectId_fieldId_key" ON "ProjectCustomField"("projectId", "fieldId");
CREATE INDEX "ProjectCustomField_fieldId_idx" ON "ProjectCustomField"("fieldId");
