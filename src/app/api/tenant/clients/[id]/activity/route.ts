import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const projects = await context.tenantDb.project.findMany({
    where: { clientId: id },
    select: { id: true, name: true },
  });
  const projectIds = projects.map((p) => p.id);
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  if (projectIds.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const events = await context.tenantDb.activityEvent.findMany({
    where: { projectId: { in: projectIds } },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    events: events.map((event) => ({
      id: event.id,
      summary: event.summary,
      createdAt: event.createdAt,
      actorName: event.actor.name ?? event.actor.email,
      projectId: event.projectId,
      projectName: projectNameById.get(event.projectId) ?? "",
    })),
  });
}
