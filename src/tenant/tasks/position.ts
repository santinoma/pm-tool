import type { PrismaClient } from "@/generated/tenant-client/client.js";

const POSITION_STEP = 1000;

/** Position for a newly created task, placed after the current last task in that status column. */
export async function nextAppendPosition(tenantDb: PrismaClient, statusId: string): Promise<number> {
  const last = await tenantDb.task.findFirst({
    where: { statusId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return (last?.position ?? 0) + POSITION_STEP;
}

/**
 * Reference "prioritize tasks inside a task list": a fractional midpoint between the
 * two neighbors the dragged task was dropped between. `before`/`after` are the
 * positions of the row immediately above/below the drop point (undefined at either
 * end of the column).
 */
export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return POSITION_STEP;
  if (before === undefined) return after! - POSITION_STEP;
  if (after === undefined) return before + POSITION_STEP;
  return (before + after) / 2;
}
