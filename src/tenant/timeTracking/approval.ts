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
