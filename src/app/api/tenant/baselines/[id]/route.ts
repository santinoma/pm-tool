import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { computeBaselineDiff } from "@/tenant/baselines/computeBaselineDiff";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const baseline = await context.tenantDb.baseline.findUnique({
    where: { id },
    include: { snapshots: true },
  });
  if (!baseline) {
    return NextResponse.json({ error: "Baseline nicht gefunden." }, { status: 404 });
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

  return NextResponse.json({ baseline, diff });
}
