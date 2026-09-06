import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { GanttClient } from "./GanttClient";

export const dynamic = "force-dynamic";

export default async function GanttPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const tasks = await context.tenantDb.task.findMany({
    where: {
      inTriage: false,
      projects: { some: { projectId: id } },
      dueDate: { not: null },
    },
    include: { blocking: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <GanttClient
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        startDate: (task.startDate ?? task.dueDate!).toISOString(),
        dueDate: task.dueDate!.toISOString(),
        blockedTaskIds: task.blocking.map((dependency) => dependency.blockedTaskId),
      }))}
    />
  );
}
