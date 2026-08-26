import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ tasks: [] });
  }

  const tasks = await context.tenantDb.task.findMany({
    where: { title: { contains: query, mode: "insensitive" } },
    include: { projects: { where: { isPrimary: true }, include: { project: true } } },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      projectName: task.projects[0]?.project.name ?? "—",
    })),
  });
}
