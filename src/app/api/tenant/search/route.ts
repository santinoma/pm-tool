import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { parseSearchQuery } from "@/tenant/search/parseSearchQuery";

export interface SearchResult {
  type: "project" | "task";
  id: string;
  title: string;
  projectId?: string;
}

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const parsed = parseSearchQuery(query);

  if (parsed.hasModifiers) {
    const assigneeId =
      parsed.assignee === "me"
        ? context.currentUser.id
        : parsed.assignee
          ? (
              await context.tenantDb.user.findFirst({
                where: {
                  OR: [
                    { name: { contains: parsed.assignee, mode: "insensitive" } },
                    { email: { contains: parsed.assignee, mode: "insensitive" } },
                  ],
                },
                select: { id: true },
              })
            )?.id
          : undefined;

    const tasks = await context.tenantDb.task.findMany({
      where: {
        title: parsed.freeText ? { contains: parsed.freeText, mode: "insensitive" } : undefined,
        status: parsed.statusCategory ? { category: parsed.statusCategory } : undefined,
        assigneeId: parsed.assignee ? (assigneeId ?? "__no_match__") : undefined,
        projects: parsed.project
          ? { some: { isPrimary: true, project: { name: { contains: parsed.project, mode: "insensitive" } } } }
          : undefined,
      },
      include: { projects: { where: { isPrimary: true } } },
      take: 20,
    });

    const results: SearchResult[] = tasks.map((task) => ({
      type: "task" as const,
      id: task.id,
      title: task.title,
      projectId: task.projects[0]?.projectId,
    }));
    return NextResponse.json({ results });
  }

  const [projects, tasks] = await Promise.all([
    context.tenantDb.project.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      take: 10,
    }),
    context.tenantDb.task.findMany({
      where: { title: { contains: query, mode: "insensitive" } },
      include: { projects: { where: { isPrimary: true } } },
      take: 10,
    }),
  ]);

  const results: SearchResult[] = [
    ...projects.map((project) => ({
      type: "project" as const,
      id: project.id,
      title: project.name,
    })),
    ...tasks.map((task) => ({
      type: "task" as const,
      id: task.id,
      title: task.title,
      projectId: task.projects[0]?.projectId,
    })),
  ];

  return NextResponse.json({ results });
}
