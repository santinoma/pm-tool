-- AlterEnum
ALTER TYPE "CustomFieldEntityType" ADD VALUE 'wiki_page';

-- AlterTable
ALTER TABLE "WikiPage" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "WikiPageCustomFieldValue" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "WikiPageCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedWikiLink" (
    "id" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedWikiLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageCustomFieldValue_fieldId_wikiPageId_key" ON "WikiPageCustomFieldValue"("fieldId", "wikiPageId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedWikiLink_token_key" ON "SharedWikiLink"("token");

-- AddForeignKey
ALTER TABLE "WikiPageCustomFieldValue" ADD CONSTRAINT "WikiPageCustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomFieldDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageCustomFieldValue" ADD CONSTRAINT "WikiPageCustomFieldValue_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedWikiLink" ADD CONSTRAINT "SharedWikiLink_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedWikiLink" ADD CONSTRAINT "SharedWikiLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
