import { redirect } from "next/navigation";
import { getTenantContext } from "@/tenant/context";
import { privateTaskVisibilityFilter } from "@/tenant/projectAccess/privateTaskFilter";
import { CalendarClient } from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    redirect("/login");
  }

  const tasks = await context.tenantDb.task.findMany({
    where: {
      AND: [
        { inTriage: false, projects: { some: { projectId: id } }, dueDate: { not: null } },
        privateTaskVisibilityFilter(context.currentUser),
      ],
    },
  });

  return (
    <CalendarClient
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate!.toISOString(),
      }))}
    />
  );
}
