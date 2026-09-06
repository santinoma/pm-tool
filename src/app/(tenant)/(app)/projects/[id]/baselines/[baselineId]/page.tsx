import { notFound, redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { computeBaselineDiff } from "@/tenant/baselines/computeBaselineDiff";
import { BaselineDetailClient } from "./BaselineDetailClient";

export const dynamic = "force-dynamic";

export default async function BaselineDetailPage({
  params,
}: {
  params: Promise<{ id: string; baselineId: string }>;
}) {
  const { baselineId } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const baseline = await context.tenantDb.baseline.findUnique({
    where: { id: baselineId },
    include: { snapshots: true },
  });
  if (!baseline) {
    notFound();
  }

  const currentTasks = await context.tenantDb.task.findMany({
    where: { projects: { some: { projectId: baseline.projectId } } },
    include: { status: true },
  });

  const diff = computeBaselineDiff(
    baseline.snapshots.map((snapshot) => ({
      taskId: snapshot.taskId,
      taskTitle: snapshot.taskTitle,
      dueDate: snapshot.dueDate,
      estimatedHours: snapshot.estimatedHours,
      statusCategory: snapshot.statusCategory,
    })),
    currentTasks.map((task) => ({
      taskId: task.id,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      statusCategory: task.status.category,
    })),
  );

  return (
    <BaselineDetailClient
      baselineName={baseline.name}
      createdAt={baseline.createdAt.toISOString()}
      diff={diff}
    />
  );
}
