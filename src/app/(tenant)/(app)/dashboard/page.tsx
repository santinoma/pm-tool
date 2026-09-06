import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateDashboards } from "@/tenant/reporting/dashboards";
import { computeOverdueTasks } from "@/tenant/reporting/overdue";
import { computeProgress } from "@/tenant/reporting/progress";
import { getCurrentWeekRange, isWithinWeek } from "@/tenant/resourcePlanning/week";
import { computeUtilization } from "@/tenant/resourcePlanning/utilization";
import { aggregateByProject, aggregateByUserPeriod, isoWeekKey, monthKey } from "@/tenant/timeTracking/duration";
import { computeBudgetStatus } from "@/tenant/budgeting/aggregate";
import { countBusinessDays, computeCreditedHours } from "@/tenant/absence/businessDays";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  const userId = context.currentUser.id;

  const [dashboards, allTasks, projects, timeEntries, taskLinks, myTimeEntriesAll, absencesOverlappingMonth, recentActivity, allBookings] =
    await Promise.all([
      getOrCreateDashboards(context, userId),
      context.tenantDb.task.findMany({
        where: { inTriage: false },
        include: {
          status: true,
          assignee: true,
          projects: { where: { isPrimary: true }, include: { project: true } },
        },
      }),
      context.tenantDb.project.findMany({ orderBy: { name: "asc" } }),
      context.tenantDb.timeEntry.findMany({
        where: { durationMinutes: { not: null } },
        select: { taskId: true, projectId: true, durationMinutes: true },
      }),
      context.tenantDb.taskProject.findMany({
        where: { isPrimary: true },
        select: { taskId: true, projectId: true, isPrimary: true },
      }),
      context.tenantDb.timeEntry.findMany({
        where: { userId, durationMinutes: { not: null } },
        select: { durationMinutes: true, startedAt: true, createdAt: true, projectId: true, taskId: true },
      }),
      context.tenantDb.absenceRequest.findMany({
        where: { status: "approved" },
        include: { user: true },
      }),
      context.tenantDb.activityEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { actor: true, project: true },
      }),
      context.tenantDb.resourceBooking.findMany({
        include: { project: true },
      }),
    ]);

  const currentWeekForForecast = getCurrentWeekRange(new Date());
  const weekTimeEntries = await context.tenantDb.timeEntry.findMany({
    where: {
      durationMinutes: { not: null },
      OR: [
        { startedAt: { gte: currentWeekForForecast.start, lte: currentWeekForForecast.end } },
        { startedAt: null, createdAt: { gte: currentWeekForForecast.start, lte: currentWeekForForecast.end } },
      ],
    },
    select: { taskId: true, projectId: true, durationMinutes: true },
  });

  const overdue = computeOverdueTasks(
    allTasks.map((t) => ({ id: t.id, dueDate: t.dueDate, statusCategory: t.status.category })),
    new Date(),
  );
  const overdueIds = new Set(overdue.map((t) => t.id));
  const overdueTasks = allTasks
    .filter((t) => overdueIds.has(t.id))
    .map((t) => ({
      id: t.id,
      title: t.title,
      projectId: t.projects[0]?.project.id ?? null,
      projectName: t.projects[0]?.project.name ?? "—",
    }));

  const myTasks = allTasks
    .filter((t) => t.assigneeId === userId && t.status.category !== "done")
    .map((t) => ({
      id: t.id,
      title: t.title,
      projectId: t.projects[0]?.project.id ?? null,
      projectName: t.projects[0]?.project.name ?? "—",
    }));

  const progressByProject = projects.map((project) => {
    const tasks = allTasks
      .filter((t) => t.projects[0]?.project.id === project.id)
      .map((t) => ({ statusCategory: t.status.category }));
    return { projectId: project.id, projectName: project.name, ...computeProgress(tasks) };
  });

  const week = getCurrentWeekRange(new Date());
  const myWeekTasks = allTasks.filter(
    (t) =>
      t.assigneeId === userId &&
      t.status.category !== "done" &&
      t.dueDate &&
      isWithinWeek(t.dueDate, week),
  );
  const myUtilization = computeUtilization(myWeekTasks, context.currentUser.weeklyCapacityHours);

  const actualMinutesByProject = aggregateByProject(timeEntries, taskLinks);
  const budgetStatuses = projects
    .filter((p) => p.budgetHours !== null || p.budgetAmount !== null)
    .map((project) => {
      const { actualHours, actualAmount } = computeBudgetStatus(
        actualMinutesByProject[project.id] ?? 0,
        project.hourlyRate,
      );
      return {
        projectId: project.id,
        projectName: project.name,
        budgetHours: project.budgetHours,
        actualHours,
        budgetAmount: project.budgetAmount,
        actualAmount,
      };
    });

  // Out of office this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const outOfOffice = absencesOverlappingMonth
    .filter((a) => a.startDate.getTime() <= monthEnd.getTime() && a.endDate.getTime() >= monthStart.getTime())
    .map((a) => ({
      userLabel: a.user.name ?? a.user.email,
      startDate: a.startDate.toISOString(),
      endDate: a.endDate.toISOString(),
    }));

  // Feed
  const activityFeed = recentActivity.map((event) => ({
    id: event.id,
    summary: event.summary,
    actorLabel: event.actor.name ?? event.actor.email,
    projectId: event.project.id,
    projectName: event.project.name,
    createdAt: event.createdAt.toISOString(),
  }));

  // My monthly / yearly time spent
  const projectTypeById = new Map(projects.map((p) => [p.id, p.type]));
  const primaryProjectByTask = new Map(taskLinks.map((link) => [link.taskId, link.projectId]));
  function resolveEntryProjectType(entry: { projectId: string | null; taskId: string | null }): string | null {
    const projectId = entry.projectId ?? (entry.taskId ? primaryProjectByTask.get(entry.taskId) : undefined);
    return projectId ? (projectTypeById.get(projectId) ?? null) : null;
  }

  const monthEntries = myTimeEntriesAll.filter((e) => {
    const date = e.startedAt ?? e.createdAt;
    return date >= monthStart && date <= monthEnd;
  });
  const workedByWeek = aggregateByUserPeriod(monthEntries, isoWeekKey);
  const billableByWeek = aggregateByUserPeriod(
    monthEntries.filter((e) => resolveEntryProjectType(e) === "client"),
    isoWeekKey,
  );
  const weekKeys = Array.from(new Set(monthEntries.map((e) => isoWeekKey(e.startedAt ?? e.createdAt)))).sort();
  const weeklyCapacity = context.currentUser.weeklyCapacityHours;
  const timeSpentMonthly = weekKeys.map((week) => {
    const workedMinutes = workedByWeek[week] ?? 0;
    const billableMinutes = billableByWeek[week] ?? 0;
    const availableHours = computeCreditedHours(5, weeklyCapacity);
    const workedHours = workedMinutes / 60;
    return {
      period: week,
      availableHours,
      workedHours,
      billableHours: billableMinutes / 60,
      missingHours: Math.max(0, availableHours - workedHours),
    };
  });

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  const yearEntries = myTimeEntriesAll.filter((e) => {
    const date = e.startedAt ?? e.createdAt;
    return date >= yearStart && date <= yearEnd;
  });
  const workedByMonth = aggregateByUserPeriod(yearEntries, monthKey);
  const billableByMonth = aggregateByUserPeriod(
    yearEntries.filter((e) => resolveEntryProjectType(e) === "client"),
    monthKey,
  );
  const monthKeysThisYear = Array.from({ length: now.getMonth() + 1 }, (_, i) => monthKey(new Date(now.getFullYear(), i, 1)));
  const timeSpentYearly = monthKeysThisYear.map((month) => {
    const [y, m] = month.split("/").map(Number);
    const businessDays = countBusinessDays(new Date(y, m - 1, 1), new Date(y, m, 0));
    const availableHours = computeCreditedHours(businessDays, weeklyCapacity);
    const workedHours = (workedByMonth[month] ?? 0) / 60;
    return {
      period: month,
      availableHours,
      workedHours,
      billableHours: (billableByMonth[month] ?? 0) / 60,
      missingHours: Math.max(0, availableHours - workedHours),
    };
  });

  // Fulfillment of forecast (this week, per project)
  const billableMinutesByProjectThisWeek = aggregateByProject(weekTimeEntries, taskLinks);
  const forecastByProject = new Map<string, number>();
  for (const booking of allBookings) {
    const overlapStart = booking.startDate > currentWeekForForecast.start ? booking.startDate : currentWeekForForecast.start;
    const overlapEnd = booking.endDate < currentWeekForForecast.end ? booking.endDate : currentWeekForForecast.end;
    if (overlapEnd < overlapStart) continue;
    const overlapDays = countBusinessDays(overlapStart, overlapEnd);
    forecastByProject.set(booking.projectId, (forecastByProject.get(booking.projectId) ?? 0) + overlapDays * booking.hoursPerDay);
  }
  const forecastFulfillment = Array.from(forecastByProject.entries())
    .map(([projectId, forecastHours]) => {
      const project = projects.find((p) => p.id === projectId);
      const billableHours = (billableMinutesByProjectThisWeek[projectId] ?? 0) / 60;
      return {
        projectId,
        projectName: project?.name ?? "—",
        forecastHours,
        billableHours,
        ratioPercent: forecastHours > 0 ? Math.round((billableHours / forecastHours) * 100) : 0,
      };
    })
    .filter((row) => row.forecastHours > 0);

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle="Dashboard"
    >
      <DashboardClient
        locale={context.currentUser.locale}
        dashboards={dashboards.map((dashboard) => ({
          id: dashboard.id,
          name: dashboard.name,
          isDefault: dashboard.isDefault,
          widgets: dashboard.widgets.map((widget) => ({
            id: widget.id,
            widgetType: widget.widgetType,
            title: widget.title,
            enabled: widget.enabled,
            position: widget.position,
            span: widget.span,
            filterProjectId: widget.filterProjectId,
          })),
        }))}
        projects={projects.map((project) => ({ id: project.id, name: project.name }))}
        overdueTasks={overdueTasks}
        myTasks={myTasks}
        progressByProject={progressByProject}
        myUtilization={{ plannedHours: myUtilization.plannedHours, weeklyCapacityHours: context.currentUser.weeklyCapacityHours }}
        budgetStatuses={budgetStatuses}
        outOfOffice={outOfOffice}
        activityFeed={activityFeed}
        timeSpentMonthly={timeSpentMonthly}
        timeSpentYearly={timeSpentYearly}
        forecastFulfillment={forecastFulfillment}
      />
    </AppShellNextElite>
  );
}
