import type { PrismaClient } from "@/generated/tenant-client/client.js";

/**
 * Design choice: a TimesheetLock freezes an ENTIRE period for a user, not just
 * the entries that happen to be `approved` at lock time. This keeps the mental
 * model simple ("this period is closed") instead of requiring every caller to
 * reason about the cross product of approvalStatus x lock coverage. Pending or
 * rejected entries inside a locked period become just as immutable as approved
 * ones — the lock is the single source of truth for editability.
 */

export interface LockPeriod {
  periodStart: Date;
  periodEnd: Date;
}

export interface EntryDateLike {
  startedAt?: Date | null;
  createdAt: Date;
}

/**
 * The "date" of a time entry for lock-period purposes: entries booked against a
 * budget section have a real startedAt; plain duration entries (task/project
 * level) don't, so we fall back to createdAt.
 */
export function getEntryDate(entry: EntryDateLike): Date {
  return entry.startedAt ?? entry.createdAt;
}

export function findCoveringLock<T extends LockPeriod>(date: Date, locks: T[]): T | undefined {
  const time = date.getTime();
  return locks.find((lock) => time >= lock.periodStart.getTime() && time <= lock.periodEnd.getTime());
}

export function isDateLocked(date: Date, locks: LockPeriod[]): boolean {
  return findCoveringLock(date, locks) !== undefined;
}

export interface TimeEntryProjectLike {
  projectId: string | null;
  taskId: string | null;
  budgetSectionId: string | null;
}

/**
 * A time entry can be booked directly against a project, against a task
 * (which belongs to a project via its primary project link), or against a
 * budget section (which belongs to a budget, which belongs to a project).
 * Notifications are project-scoped, so callers need the resolved project id
 * regardless of which of those three the entry was actually logged against.
 */
export async function resolveTimeEntryProjectId(tenantDb: PrismaClient, entry: TimeEntryProjectLike): Promise<string | null> {
  if (entry.projectId) {
    return entry.projectId;
  }
  if (entry.taskId) {
    const link = await tenantDb.taskProject.findFirst({
      where: { taskId: entry.taskId, isPrimary: true },
      select: { projectId: true },
    });
    return link?.projectId ?? null;
  }
  if (entry.budgetSectionId) {
    const section = await tenantDb.budgetSection.findUnique({
      where: { id: entry.budgetSectionId },
      select: { budget: { select: { projectId: true } } },
    });
    return section?.budget.projectId ?? null;
  }
  return null;
}
