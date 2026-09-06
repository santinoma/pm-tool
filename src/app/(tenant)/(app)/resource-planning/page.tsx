import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { getCurrentWeekRange, isWithinWeek } from "@/tenant/resourcePlanning/week";
import { computeUtilization } from "@/tenant/resourcePlanning/utilization";
import { computeEffectiveWeeklyCapacity } from "@/tenant/resourcePlanning/holidays";
import { addDays } from "@/tenant/projects/dateUtils";
import { AppShellNextElite } from "@/ui/nextelite/AppShellNextElite";
import { ResourcePlanningClient } from "./ResourcePlanningClient";

export const dynamic = "force-dynamic";

export default async function ResourcePlanningPage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const week = getCurrentWeekRange(new Date());
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(week.start, index));
  const canEdit = canManageMembers(context.currentUser.role);

  const [users, tasks, projects, bookings] = await Promise.all([
    context.tenantDb.user.findMany({
      orderBy: { email: "asc" },
      include: { holidayCalendar: { include: { holidays: true } } },
    }),
    context.tenantDb.task.findMany({
      where: { assigneeId: { not: null } },
      include: { status: true, projects: { where: { isPrimary: true }, include: { project: true } } },
    }),
    context.tenantDb.project.findMany({
      where: canEdit ? undefined : { members: { some: { userId: context.currentUser.id } } },
      orderBy: { name: "asc" },
      include: { budgets: { include: { sections: { select: { id: true, name: true } } } } },
    }),
    context.tenantDb.resourceBooking.findMany({
      where: {
        startDate: { lte: week.end },
        endDate: { gte: week.start },
        ...(canEdit ? {} : { project: { members: { some: { userId: context.currentUser.id } } } }),
      },
      include: { user: true, project: true, budgetSection: true },
      orderBy: { startDate: "asc" },
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
    const effectiveWeeklyCapacityHours = computeEffectiveWeeklyCapacity(
      user.weeklyCapacityHours,
      weekDays,
      user.holidayCalendar?.holidays ?? [],
    );
    const { plannedHours, utilizationPercent } = computeUtilization(relevantTasks, effectiveWeeklyCapacityHours);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      weeklyCapacityHours: user.weeklyCapacityHours,
      effectiveWeeklyCapacityHours,
      plannedHours,
      utilizationPercent,
      tasks: relevantTasks,
    };
  });

  const bookingPeople = users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    weeklyCapacityHours: user.weeklyCapacityHours,
  }));

  const bookingProjects = projects.map((project) => ({
    id: project.id,
    name: project.name,
    budgetSections: project.budgets.flatMap((budget) => budget.sections.map((section) => ({ id: section.id, name: section.name }))),
  }));

  const initialBookings = bookings.map((booking) => ({
    id: booking.id,
    userId: booking.userId,
    placeholderName: booking.placeholderName,
    userName: booking.user ? (booking.user.name ?? booking.user.email) : booking.placeholderName ?? "—",
    projectId: booking.projectId,
    projectName: booking.project.name,
    budgetSectionId: booking.budgetSectionId,
    budgetSectionName: booking.budgetSection?.name ?? null,
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    hoursPerDay: booking.hoursPerDay,
    isTentative: booking.isTentative,
  }));

  return (
    <AppShellNextElite
      currentUser={{ name: context.currentUser.name, email: context.currentUser.email, avatarUrl: context.currentUser.avatarUrl, role: context.currentUser.role, locale: context.currentUser.locale }}
      entitledFeatures={Array.from(context.entitledFeatures)}
      pageTitle={context.currentUser.locale === "en" ? "Resourcing" : "Ressourcen"}
    >
      <ResourcePlanningClient
        canEdit={canEdit}
        locale={context.currentUser.locale}
        weekStart={week.start.toISOString()}
        weekEnd={week.end.toISOString()}
        people={people}
        bookingPeople={bookingPeople}
        bookingProjects={bookingProjects}
        initialBookings={initialBookings}
      />
    </AppShellNextElite>
  );
}
