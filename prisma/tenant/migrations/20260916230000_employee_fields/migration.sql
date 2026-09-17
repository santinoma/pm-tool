-- Productive.io "Employee Fields" (Settings > Users) — custom fields scoped
-- to the User entity, org-wide (no per-project attachment, unlike task/
-- budget/wiki_page library fields).

ALTER TYPE "CustomFieldEntityType" ADD VALUE 'user';

CREATE TABLE "UserCustomFieldValue" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "UserCustomFieldValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCustomFieldValue_fieldId_userId_key" ON "UserCustomFieldValue"("fieldId", "userId");

ALTER TABLE "UserCustomFieldValue" ADD CONSTRAINT "UserCustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomFieldDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserCustomFieldValue" ADD CONSTRAINT "UserCustomFieldValue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
