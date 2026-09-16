export type TimesheetStatus = "not_submitted" | "partially_submitted" | "submitted";

export function computeTimesheetStatus(entryCount: number, submittedCount: number): TimesheetStatus {
  if (entryCount === 0 || submittedCount === 0) return "not_submitted";
  if (submittedCount < entryCount) return "partially_submitted";
  return "submitted";
}

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfWeek(weekStart: Date): Date {
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}
