import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { computeOverdueTasks } from "@/tenant/reporting/overdue";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const tasks = await context.tenantDb.task.findMany({
    where: {
      inTriage: false,
      ...(isPrivileged
        ? {}
        : { projects: { some: { project: { members: { some: { userId: context.currentUser.id } } } } } }),
    },
    include: {
      status: true,
      assignee: true,
      projects: { where: { isPrimary: true }, include: { project: true } },
    },
  });

  const overdue = computeOverdueTasks(
    tasks.map((task) => ({ id: task.id, dueDate: task.dueDate, statusCategory: task.status.category })),
    new Date(),
  );
  const overdueIds = new Set(overdue.map((task) => task.id));

  const result = tasks
    .filter((task) => overdueIds.has(task.id))
    .map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      assignee: task.assignee?.name ?? task.assignee?.email ?? null,
      projectName: task.projects[0]?.project.name ?? "—",
    }));

  return NextResponse.json({ tasks: result });
}
