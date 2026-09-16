import { computeTimesheetStatus, type TimesheetStatus } from "@/tenant/timeTracking/submission";

export type { TimesheetStatus };

export interface WeekSummaryUser {
  id: string;
  name: string | null;
  email: string;
  weeklyCapacityHours: number;
}

export interface WeekSummaryEntry {
  userId: string;
  date: string; // YYYY-MM-DD, day the entry counts toward
  durationMinutes: number;
  serviceLabel: string | null;
  timeRange: string | null; // e.g. "08:15–08:30", null for pure-duration timer entries
  description: string | null;
  submitted: boolean;
}

export interface WeekSummaryAbsence {
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface DaySummary {
  date: string;
  hours: number;
  isAbsence: boolean;
  entries: WeekSummaryEntry[];
}

export interface UserWeekSummary {
  userId: string;
  userLabel: string;
  days: DaySummary[];
  totalHours: number;
  timesheetStatus: TimesheetStatus;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildWeekSummary(
  users: WeekSummaryUser[],
  entries: WeekSummaryEntry[],
  approvedAbsences: WeekSummaryAbsence[],
  weekDates: string[],
): UserWeekSummary[] {
  return users.map((user) => {
    const userEntries = entries.filter((entry) => entry.userId === user.id);
    const userAbsences = approvedAbsences.filter((absence) => absence.userId === user.id);

    let totalHours = 0;
    const days = weekDates.map((date) => {
      const dayEntries = userEntries.filter((entry) => entry.date === date);
      const bookedHours = dayEntries.reduce((sum, entry) => sum + entry.durationMinutes / 60, 0);
      const isAbsence = userAbsences.some((absence) => absence.startDate <= date && date <= absence.endDate);
      const absenceHours = isAbsence ? user.weeklyCapacityHours / 5 : 0;
      const hours = round2(bookedHours + absenceHours);
      totalHours += hours;
      return { date, hours, isAbsence, entries: dayEntries };
    });

    const timesheetStatus = computeTimesheetStatus(
      userEntries.length,
      userEntries.filter((entry) => entry.submitted).length,
    );

    return {
      userId: user.id,
      userLabel: user.name ?? user.email,
      days,
      totalHours: round2(totalHours),
      timesheetStatus,
    };
  });
}
