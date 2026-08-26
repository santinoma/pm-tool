import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { computeProgress } from "@/tenant/reporting/progress";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const projects = await context.tenantDb.project.findMany({
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
