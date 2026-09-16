-- Centralize RateCardItem under named, per-client RateCard containers,
-- mirroring the Workflow/Pipeline pattern: a lossless migration that seeds
-- one tenant-wide "Default Rate Card" and reassigns every existing
-- RateCardItem to it, so nothing visibly changes for existing data.

-- CreateTable
CREATE TABLE "RateCard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed one tenant-wide default Rate Card and backfill existing items onto it
DO $$
DECLARE
    default_rate_card_id TEXT;
BEGIN
    default_rate_card_id := gen_random_uuid()::TEXT;
    INSERT INTO "RateCard" ("id", "name", "clientId", "archived", "createdAt")
    VALUES (default_rate_card_id, 'Default Rate Card', NULL, false, CURRENT_TIMESTAMP);

    ALTER TABLE "RateCardItem" ADD COLUMN "rateCardId" TEXT;
    UPDATE "RateCardItem" SET "rateCardId" = default_rate_card_id;
END $$;

-- Now that every row has a value, enforce NOT NULL and add the FK
ALTER TABLE "RateCardItem" ALTER COLUMN "rateCardId" SET NOT NULL;
ALTER TABLE "RateCardItem" ADD CONSTRAINT "RateCardItem_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "RateCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "RateCard_clientId_idx" ON "RateCard"("clientId");
CREATE INDEX "RateCardItem_rateCardId_idx" ON "RateCardItem"("rateCardId");
