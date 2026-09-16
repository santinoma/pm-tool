import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { getEntryDate, isDateLocked } from "@/tenant/timeTracking/approval";
import { TimeTrackingClient } from "./TimeTrackingClient";
import { EntriesCalendarClient } from "./EntriesCalendarClient";

export const dynamic = "force-dynamic";

export default async function TimePage() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }
  const userId = context.currentUser.id;
  const settings = await getOrCreateTenantSettings(context.tenantDb);

  if (settings.timeTrackingMode === "entries") {
    const [sections, entries] = await Promise.all([
      context.tenantDb.budgetSection.findMany({
        where: { assignees: { some: { userId } } },
        include: { budget: { include: { project: true } } },
      }),
      context.tenantDb.timeEntry.findMany({
        where: { userId, budgetSectionId: { not: null } },
        include: { budgetSection: true },
        orderBy: { startedAt: "desc" },
        take: 200,
      }),
    ]);

    return (
      <EntriesCalendarClient
        services={sections.map((section) => ({
          id: section.id,
          label: `${section.budget.project.name} · ${section.budget.title} · ${section.name}`,
        }))}
        entries={entries
          .filter((entry) => entry.startedAt && entry.endedAt)
          .map((entry) => ({
            id: entry.id,
            budgetSectionId: entry.budgetSectionId!,
            serviceLabel: entry.budgetSection?.name ?? "—",
            startedAt: entry.startedAt!.toISOString(),
            endedAt: entry.endedAt!.toISOString(),
            description: entry.description,
          }))}
      />
    );
  }

  const isPrivileged = canManageMembers(context.currentUser.role);

  const [runningEntry, myEntries, projects, myLocks, pendingEntries, activeUsers] = await Promise.all([
    context.tenantDb.timeEntry.findFirst({
      where: { userId, startedAt: { not: null }, endedAt: null },
      include: { task: true, project: true },
    }),
    context.tenantDb.timeEntry.findMany({
      where: { userId, durationMinutes: { not: null } },
      include: { task: true, project: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    context.tenantDb.project.findMany({
      include: { taskLinks: { where: { isPrimary: true }, include: { task: true } } },
    }),
    context.tenantDb.timesheetLock.findMany({ where: { userId } }),
    isPrivileged
      ? context.tenantDb.timeEntry.findMany({
          where: { approvalStatus: "pending", submittedAt: { not: null } },
          include: { user: true, task: true, project: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    isPrivileged
      ? context.tenantDb.user.findMany({ where: { isActive: true }, orderBy: { email: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <TimeTrackingClient
      allowProjectLevelTimeEntries={settings.allowProjectLevelTimeEntries}
      isPrivileged={isPrivileged}
      runningEntry={
        runningEntry
          ? {
              id: runningEntry.id,
              startedAt: runningEntry.startedAt!.toISOString(),
              label: runningEntry.task?.title ?? runningEntry.project?.name ?? "—",
            }
          : null
      }
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        tasks: project.taskLinks
          .filter((link) => !link.task.inTriage)
          .map((link) => ({ id: link.task.id, title: link.task.title })),
      }))}
      entries={myEntries.map((entry) => ({
        id: entry.id,
        label: entry.task?.title ?? entry.project?.name ?? "—",
        durationMinutes: entry.durationMinutes ?? 0,
        description: entry.description,
        approvalStatus: entry.approvalStatus,
        submitted: entry.submittedAt !== null,
        locked: isDateLocked(getEntryDate(entry), myLocks),
        date: getEntryDate(entry).toISOString(),
        taskId: entry.taskId,
        projectId: entry.projectId,
      }))}
      pendingEntries={pendingEntries.map((entry) => ({
        id: entry.id,
        userLabel: entry.user.name ?? entry.user.email,
        label: entry.task?.title ?? entry.project?.name ?? "—",
        durationMinutes: entry.durationMinutes ?? 0,
        description: entry.description,
      }))}
      users={activeUsers.map((user) => ({ id: user.id, label: user.name ?? user.email }))}
    />
  );
}
