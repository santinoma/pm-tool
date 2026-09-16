import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { privateTaskVisibilityFilter } from "@/tenant/projectAccess/privateTaskFilter";
import { TimelineClient } from "./TimelineClient";

export const dynamic = "force-dynamic";

// Reference "Timeline Layout": tasks with due dates plotted on a date axis, earliest
// start date first; tasks without a due date live in the "Unscheduled" side list.
export default async function TimelineViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const tasks = await context.tenantDb.task.findMany({
    where: {
      AND: [
        { inTriage: false, projects: { some: { projectId: id } } },
        privateTaskVisibilityFilter(context.currentUser),
      ],
    },
    include: { status: true, assignee: true },
    orderBy: { position: "asc" },
  });

  return (
    <TimelineClient
      projectId={id}
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        statusCategory: task.status.category,
        assignee: task.assignee?.name ?? task.assignee?.email ?? null,
        startDate: task.startDate ? task.startDate.toISOString() : null,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      }))}
    />
  );
}
