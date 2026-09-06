import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { computeProgress } from "@/tenant/reporting/progress";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const isPrivileged = canManageMembers(context.currentUser.role);
  const projects = await context.tenantDb.project.findMany({
    where: isPrivileged ? undefined : { members: { some: { userId: context.currentUser.id } } },
    include: { taskLinks: { where: { isPrimary: true }, include: { task: { include: { status: true } } } } },
    orderBy: { name: "asc" },
  });

  const result = projects.map((project) => {
    const tasks = project.taskLinks
      .map((link) => link.task)
      .filter((task) => !task.inTriage)
      .map((task) => ({ statusCategory: task.status.category }));
    return { projectId: project.id, projectName: project.name, ...computeProgress(tasks) };
  });

  return NextResponse.json({ projects: result });
}
