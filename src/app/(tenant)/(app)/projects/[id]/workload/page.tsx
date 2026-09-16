import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { WorkloadClient } from "./WorkloadClient";

export const dynamic = "force-dynamic";

// Reference "Workload View (Beta)": per-person planned-hours-vs-capacity, scoped here
// to this project's members rather than the whole organization (Resourcing >
// Resource Planner already covers the cross-project view).
export default async function WorkloadViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const [members, tasks] = await Promise.all([
    context.tenantDb.projectMember.findMany({
      where: { projectId: id },
      include: { user: { include: { holidayCalendar: { include: { holidays: true } } } } },
    }),
    context.tenantDb.task.findMany({
      where: {
        assigneeId: { not: null },
        dueDate: { not: null },
        projects: { some: { projectId: id } },
        status: { category: { not: "done" } },
      },
      select: { id: true, title: true, estimatedHours: true, dueDate: true, assigneeId: true },
    }),
  ]);

  return (
    <WorkloadClient
      projectId={id}
      people={members.map((member) => ({
        id: member.user.id,
        label: member.user.name ?? member.user.email,
        weeklyCapacityHours: member.user.weeklyCapacityHours,
        holidays: (member.user.holidayCalendar?.holidays ?? []).map((h) => h.date.toISOString()),
      }))}
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        estimatedHours: task.estimatedHours,
        dueDate: task.dueDate!.toISOString(),
        assigneeId: task.assigneeId!,
      }))}
    />
  );
}
