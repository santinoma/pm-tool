import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { BoardClient } from "./BoardClient";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [statuses, tasks] = await Promise.all([
    context.tenantDb.workflowStatus.findMany({
      where: { projectId: id },
      orderBy: { position: "asc" },
    }),
    context.tenantDb.task.findMany({
      where: { inTriage: false, projects: { some: { projectId: id } } },
      include: { assignee: true },
    }),
  ]);

  return (
    <BoardClient
      projectId={id}
      statuses={statuses.map((status) => ({ id: status.id, name: status.name }))}
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        statusId: task.statusId,
        assignee: task.assignee?.name ?? task.assignee?.email ?? null,
      }))}
    />
  );
}
