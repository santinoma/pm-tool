import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { WIDGET_CATALOG, mergeWidgetPreferences } from "@/tenant/reporting/widgets";
import { computeOverdueTasks } from "@/tenant/reporting/overdue";
import { computeProgress } from "@/tenant/reporting/progress";
import { getCurrentWeekRange, isWithinWeek } from "@/tenant/resourcePlanning/week";
import { computeUtilization } from "@/tenant/resourcePlanning/utilization";
import { aggregateByProject } from "@/tenant/timeTracking/duration";
import { computeBudgetStatus } from "@/tenant/budgeting/aggregate";
import { AppShell } from "@/ui/shell/AppShell";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  const userId = context.currentUser.id;

  const [savedWidgetPrefs, allTasks, projects, timeEntries, taskLinks] = await Promise.all([
    context.tenantDb.dashboardWidgetPreference.findMany({ where: { userId } }),
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
  ]);

  const widgets = mergeWidgetPreferences(WIDGET_CATALOG, savedWidgetPrefs);

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

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <DashboardClient
        widgets={widgets}
        overdueTasks={overdueTasks}
        myTasks={myTasks}
        progressByProject={progressByProject}
        myUtilization={{ plannedHours: myUtilization.plannedHours, weeklyCapacityHours: context.currentUser.weeklyCapacityHours }}
        budgetStatuses={budgetStatuses}
      />
    </AppShell>
  );
}
