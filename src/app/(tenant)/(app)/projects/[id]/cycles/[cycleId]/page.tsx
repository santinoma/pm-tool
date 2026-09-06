import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { computeCycleInsights } from "@/tenant/cycles/cycleInsights";
import { CycleDetailClient } from "./CycleDetailClient";

export const dynamic = "force-dynamic";

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string; cycleId: string }>;
}) {
  const { id, cycleId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const cycle = await context.tenantDb.cycle.findUnique({
    where: { id: cycleId },
    include: { tasks: { include: { status: true, assignee: true } } },
  });
  if (!cycle) {
    redirect(`/projects/${id}/cycles`);
  }

  const availableTasks = await context.tenantDb.task.findMany({
    where: {
      inTriage: false,
      cycleId: null,
      projects: { some: { projectId: id, isPrimary: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const insights = computeCycleInsights(
    cycle.tasks.map((task) => ({
      statusCategory: task.status.category,
      estimatedHours: task.estimatedHours,
      cycleAssignedAt: task.cycleAssignedAt,
    })),
    cycle.startDate,
  );

  return (
    <CycleDetailClient
      projectId={id}
      cycle={{
        id: cycle.id,
        name: cycle.name,
        startDate: cycle.startDate.toISOString().slice(0, 10),
        endDate: cycle.endDate.toISOString().slice(0, 10),
      }}
      insights={insights}
      tasks={cycle.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        statusName: task.status.name,
        statusCategory: task.status.category,
        estimatedHours: task.estimatedHours,
        assigneeLabel: task.assignee?.name ?? task.assignee?.email ?? null,
        isScopeCreep:
          task.cycleAssignedAt !== null && task.cycleAssignedAt.getTime() > cycle.startDate.getTime(),
      }))}
      availableTasks={availableTasks.map((task) => ({ id: task.id, title: task.title }))}
    />
  );
}
