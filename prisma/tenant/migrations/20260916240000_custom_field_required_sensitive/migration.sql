-- Productive.io "Required Custom Fields" and "Sensitive Custom Fields".
ALTER TABLE "CustomFieldDef" ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CustomFieldDef" ADD COLUMN "sensitive" BOOLEAN NOT NULL DEFAULT false;
