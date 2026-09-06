import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const entityType = new URL(request.url).searchParams.get("entityType") ?? undefined;

  const favorites = await context.tenantDb.favorite.findMany({
    where: { userId: context.currentUser.id, entityType: entityType || undefined },
    orderBy: { createdAt: "desc" },
  });

  // Für die Favoriten-Navigation reichen wir Projekt-/Task-Titel + Ziel-URL direkt an,
  // damit die UI nicht pro Favorit einen weiteren Roundtrip machen muss.
  const projectIds = favorites.filter((f) => f.entityType === "project").map((f) => f.entityId);
  const taskIds = favorites.filter((f) => f.entityType === "task").map((f) => f.entityId);

  const [projects, tasks] = await Promise.all([
    projectIds.length > 0
      ? context.tenantDb.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    taskIds.length > 0
      ? context.tenantDb.task.findMany({
          where: { id: { in: taskIds } },
          select: { id: true, title: true, projects: { where: { isPrimary: true }, select: { projectId: true } } },
        })
      : Promise.resolve([]),
  ]);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const enriched = favorites.map((favorite) => {
    if (favorite.entityType === "project") {
      const project = projectById.get(favorite.entityId);
      return { ...favorite, title: project?.name ?? null, href: `/projects/${favorite.entityId}/list` };
    }
    if (favorite.entityType === "task") {
      const task = taskById.get(favorite.entityId);
      const projectId = task?.projects[0]?.projectId;
      return {
        ...favorite,
        title: task?.title ?? null,
        href: projectId ? `/projects/${projectId}/tasks/${favorite.entityId}` : null,
      };
    }
    return { ...favorite, title: null, href: null };
  });

  return NextResponse.json({ favorites: enriched });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.entityType !== "string" || typeof body.entityId !== "string") {
    return NextResponse.json({ error: "entityType und entityId sind erforderlich." }, { status: 400 });
  }

  // Idempotent: erneutes Favorisieren derselben Entität legt keine Dubletten an
  // (@@unique([userId, entityType, entityId]) macht upsert dafür sicher).
  const favorite = await context.tenantDb.favorite.upsert({
    where: {
      userId_entityType_entityId: {
        userId: context.currentUser.id,
        entityType: body.entityType,
        entityId: body.entityId,
      },
    },
    create: {
      userId: context.currentUser.id,
      entityType: body.entityType,
      entityId: body.entityId,
    },
    update: {},
  });

  return NextResponse.json({ favorite });
}

export async function DELETE(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const url = new URL(request.url);
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");
  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType und entityId sind erforderlich." }, { status: 400 });
  }

  await context.tenantDb.favorite.deleteMany({
    where: { userId: context.currentUser.id, entityType, entityId },
  });

  return NextResponse.json({ ok: true });
}
