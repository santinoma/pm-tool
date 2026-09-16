import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { buildWeekSummary } from "@/tenant/companyTime/weekSummary";
import { CompanyTimeClient } from "./CompanyTimeClient";

export const dynamic = "force-dynamic";

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function toDateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function CompanyTimePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  if (!canManageMembers(context.currentUser.role)) {
    redirect("/time");
  }

  const { week } = await searchParams;
  const requestedWeekStart = week && !Number.isNaN(new Date(week).getTime()) ? new Date(week) : new Date();
  const weekStart = startOfWeek(requestedWeekStart);
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return toDateValue(date);
  });
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const settings = await getOrCreateTenantSettings(context.tenantDb);
  const [users, timeEntries, absences] = await Promise.all([
    context.tenantDb.user.findMany({ where: { isActive: true } }),
    context.tenantDb.timeEntry.findMany({
      where: {
        OR: [
          { startedAt: { gte: weekStart, lte: weekEnd } },
          { AND: [{ startedAt: null }, { createdAt: { gte: weekStart, lte: weekEnd } }] },
        ],
      },
      include: { budgetSection: true },
    }),
    context.tenantDb.absenceRequest.findMany({
      where: {
        status: "approved",
        startDate: { lte: weekEnd },
        endDate: { gte: weekStart },
      },
    }),
  ]);

  const summary = buildWeekSummary(
    users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      weeklyCapacityHours: user.weeklyCapacityHours,
    })),
    timeEntries
      .filter((entry) => entry.durationMinutes != null)
      .map((entry) => {
        const referenceDate = entry.startedAt ?? entry.createdAt;
        return {
          userId: entry.userId,
          date: toDateValue(referenceDate),
          durationMinutes: entry.durationMinutes!,
          serviceLabel: entry.budgetSection?.name ?? null,
          timeRange:
            entry.startedAt && entry.endedAt
              ? `${entry.startedAt.toISOString().slice(11, 16)}–${entry.endedAt.toISOString().slice(11, 16)}`
              : null,
          description: entry.description,
          submitted: entry.submittedAt !== null,
        };
      }),
    absences.map((absence) => ({
      userId: absence.userId,
      startDate: toDateValue(absence.startDate),
      endDate: toDateValue(absence.endDate),
    })),
    weekDates,
  );

  const previousWeek = new Date(weekStart);
  previousWeek.setDate(previousWeek.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return (
    <CompanyTimeClient
      isEntriesMode={settings.timeTrackingMode === "entries"}
      weekDates={weekDates}
      summary={summary}
      previousWeek={toDateValue(previousWeek)}
      nextWeek={toDateValue(nextWeek)}
    />
  );
}
