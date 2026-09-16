-- Reference "Setting up Your Sales Pipelines" / "General Sales Settings": Deal.stage
-- becomes a reference into a configurable Pipeline/DealStatus structure (mirrors the
-- Workflow/WorkflowStatus centralization for tasks) instead of a fixed enum, and
-- lostReason becomes a managed catalog (LostReason) instead of free text. Existing
-- data is preserved losslessly: a single "Default Pipeline" is seeded with 5
-- statuses matching the old enum values 1:1, and every distinct existing lostReason
-- string becomes its own LostReason row (the original text is kept verbatim in the
-- new lostReasonNote field either way).

CREATE TYPE "DealStatusCategory" AS ENUM ('open', 'won', 'lost');

CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DealStatus" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DealStatusCategory" NOT NULL,
    "position" INTEGER NOT NULL,
    "defaultProbability" INTEGER,
    "trackTime" BOOLEAN NOT NULL DEFAULT true,
    "trackExpenses" BOOLEAN NOT NULL DEFAULT true,
    "createBookings" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DealStatus_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DealStatus_pipelineId_name_key" ON "DealStatus"("pipelineId", "name");
ALTER TABLE "DealStatus" ADD CONSTRAINT "DealStatus_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LostReason" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LostReason_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LostReason_label_key" ON "LostReason"("label");

-- Seed the Default Pipeline with 5 statuses matching the old DealStage enum 1:1.
DO $$
DECLARE
  pipeline_id TEXT := gen_random_uuid()::text;
  status_lead TEXT := gen_random_uuid()::text;
  status_qualified TEXT := gen_random_uuid()::text;
  status_proposal TEXT := gen_random_uuid()::text;
  status_won TEXT := gen_random_uuid()::text;
  status_lost TEXT := gen_random_uuid()::text;
BEGIN
  INSERT INTO "Pipeline" ("id", "name") VALUES (pipeline_id, 'Default Pipeline');

  INSERT INTO "DealStatus" ("id", "pipelineId", "name", "category", "position", "defaultProbability")
  VALUES
    (status_lead, pipeline_id, 'Lead', 'open', 0, 10),
    (status_qualified, pipeline_id, 'Qualified', 'open', 1, 40),
    (status_proposal, pipeline_id, 'Proposal', 'open', 2, 70),
    (status_won, pipeline_id, 'Won', 'won', 3, 100),
    (status_lost, pipeline_id, 'Lost', 'lost', 4, 0);

  ALTER TABLE "Deal" ADD COLUMN "statusId" TEXT;
  UPDATE "Deal" SET "statusId" = CASE "stage"
    WHEN 'lead' THEN status_lead
    WHEN 'qualified' THEN status_qualified
    WHEN 'proposal' THEN status_proposal
    WHEN 'won' THEN status_won
    WHEN 'lost' THEN status_lost
  END;
END $$;

ALTER TABLE "Deal" ALTER COLUMN "statusId" SET NOT NULL;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "DealStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" DROP COLUMN "stage";
DROP TYPE "DealStage";

-- Turn each distinct existing free-text lostReason into its own catalog row, and
-- keep the original text as lostReasonNote either way (no information lost).
ALTER TABLE "Deal" ADD COLUMN "lostReasonId" TEXT;
ALTER TABLE "Deal" ADD COLUMN "lostReasonNote" TEXT;
UPDATE "Deal" SET "lostReasonNote" = "lostReason";

INSERT INTO "LostReason" ("id", "label")
SELECT gen_random_uuid()::text, "lostReason"
FROM (SELECT DISTINCT "lostReason" FROM "Deal" WHERE "lostReason" IS NOT NULL AND trim("lostReason") <> '') AS distinct_reasons;

UPDATE "Deal" d SET "lostReasonId" = lr."id" FROM "LostReason" lr WHERE lr."label" = d."lostReason";

ALTER TABLE "Deal" ADD CONSTRAINT "Deal_lostReasonId_fkey" FOREIGN KEY ("lostReasonId") REFERENCES "LostReason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" DROP COLUMN "lostReason";
