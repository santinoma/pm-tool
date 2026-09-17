-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN "conditionConfig" JSONB;

-- Migrate existing single-field conditions into the new generic condition tree.
UPDATE "AutomationRule"
SET "conditionConfig" = jsonb_build_object(
  'logic', 'AND',
  'rules', jsonb_build_array(
    jsonb_build_object('field', 'statusCategory', 'operator', 'equals', 'value', "conditionStatusCategory")
  )
)
WHERE "conditionStatusCategory" IS NOT NULL;

-- AlterTable
ALTER TABLE "AutomationRule" DROP COLUMN "conditionStatusCategory";
