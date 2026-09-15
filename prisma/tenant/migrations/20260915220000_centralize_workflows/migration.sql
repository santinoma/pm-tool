-- Reference "Creating and Managing Workflows": Workflow becomes an organization-wide,
-- reusable entity (several projects can share one), instead of task statuses being
-- hardwired to a single project. Existing per-project status sets are preserved
-- losslessly: every current project gets its own new Workflow row seeded from its
-- existing statuses, so nothing visibly changes for it — going forward, projects can
-- be repointed at a shared Workflow via Settings > Organization > Workflows.

CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- One Workflow per existing project, named after it, carrying its current statuses.
ALTER TABLE "Project" ADD COLUMN "workflowId" TEXT;

DO $$
DECLARE
  proj RECORD;
  new_wf_id TEXT;
BEGIN
  FOR proj IN SELECT "id", "name" FROM "Project" LOOP
    new_wf_id := gen_random_uuid()::text;
    INSERT INTO "Workflow" ("id", "name") VALUES (new_wf_id, proj."name" || ' Workflow');
    UPDATE "Project" SET "workflowId" = new_wf_id WHERE "id" = proj."id";
  END LOOP;
END $$;

ALTER TABLE "Project" ALTER COLUMN "workflowId" SET NOT NULL;
ALTER TABLE "Project" ADD CONSTRAINT "Project_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Repoint each status at its project's new Workflow instead of the project directly.
ALTER TABLE "WorkflowStatus" ADD COLUMN "workflowId" TEXT;
UPDATE "WorkflowStatus" ws SET "workflowId" = p."workflowId" FROM "Project" p WHERE ws."projectId" = p."id";
ALTER TABLE "WorkflowStatus" ALTER COLUMN "workflowId" SET NOT NULL;

ALTER TABLE "WorkflowStatus" DROP CONSTRAINT "WorkflowStatus_projectId_fkey";
DROP INDEX "WorkflowStatus_projectId_name_key";
ALTER TABLE "WorkflowStatus" DROP COLUMN "projectId";

ALTER TABLE "WorkflowStatus" ADD CONSTRAINT "WorkflowStatus_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "WorkflowStatus_workflowId_name_key" ON "WorkflowStatus"("workflowId", "name");
