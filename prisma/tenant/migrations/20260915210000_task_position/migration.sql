-- Reference: tasks can be manually reordered within a status column/list, and that
-- order is shared between Board and List views. Backfill preserves each task's
-- current createdAt order within its status, spaced by 1000 so future drops can
-- insert between two rows via a fractional midpoint without rewriting siblings.
ALTER TABLE "Task" ADD COLUMN "position" DOUBLE PRECISION NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT "id", (ROW_NUMBER() OVER (PARTITION BY "statusId" ORDER BY "createdAt" ASC) * 1000)::float AS "newPosition"
  FROM "Task"
)
UPDATE "Task"
SET "position" = ranked."newPosition"
FROM ranked
WHERE "Task"."id" = ranked."id";
