import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
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

  const [runningEntry, myEntries, projects] = await Promise.all([
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
  ]);

  return (
    <TimeTrackingClient
      allowProjectLevelTimeEntries={settings.allowProjectLevelTimeEntries}
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
      }))}
    />
  );
}
