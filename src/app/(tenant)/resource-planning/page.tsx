import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { getCurrentWeekRange, isWithinWeek } from "@/tenant/resourcePlanning/week";
import { computeUtilization } from "@/tenant/resourcePlanning/utilization";
import { AppShell } from "@/ui/shell/AppShell";
import { ResourcePlanningClient } from "./ResourcePlanningClient";

export const dynamic = "force-dynamic";

export default async function ResourcePlanningPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const week = getCurrentWeekRange(new Date());

  const [users, tasks] = await Promise.all([
    context.tenantDb.user.findMany({ orderBy: { email: "asc" } }),
    context.tenantDb.task.findMany({
      where: { assigneeId: { not: null } },
      include: { status: true, projects: { where: { isPrimary: true }, include: { project: true } } },
    }),
  ]);

  const relevantTasksByUser: Record<string, { id: string; title: string; estimatedHours: number | null; projectName: string }[]> = {};
  for (const task of tasks) {
    if (task.status.category === "done") continue;
    if (!task.dueDate || !isWithinWeek(task.dueDate, week)) continue;
    if (!task.assigneeId) continue;
    const projectName = task.projects[0]?.project.name ?? "—";
    (relevantTasksByUser[task.assigneeId] ??= []).push({
      id: task.id,
      title: task.title,
      estimatedHours: task.estimatedHours,
      projectName,
    });
  }

  const people = users.map((user) => {
    const relevantTasks = relevantTasksByUser[user.id] ?? [];
    const { plannedHours, utilizationPercent } = computeUtilization(relevantTasks, user.weeklyCapacityHours);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      weeklyCapacityHours: user.weeklyCapacityHours,
      plannedHours,
      utilizationPercent,
      tasks: relevantTasks,
    };
  });

  return (
    <AppShell currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role }} entitledFeatures={Array.from(context.entitledFeatures)}>
      <ResourcePlanningClient
        canEdit={canManageMembers(context.currentUser.role)}
        weekStart={week.start.toISOString()}
        weekEnd={week.end.toISOString()}
        people={people}
      />
    </AppShell>
  );
}
