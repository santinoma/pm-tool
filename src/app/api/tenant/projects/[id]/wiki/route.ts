import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { recordActivity } from "@/tenant/notifications/recordActivity";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const pages = await context.tenantDb.wikiPage.findMany({
    where: { projectId: id },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ pages });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
  }

  const page = await context.tenantDb.wikiPage.create({
    data: {
      projectId: id,
      title: body.title,
      content: typeof body.content === "string" ? body.content : "",
      createdById: context.currentUser.id,
    },
  });

  await recordActivity(context.tenantDb, {
    projectId: id,
    actorId: context.currentUser.id,
    type: "wiki_page_created",
    summary: `Wiki-Seite „${page.title}“ wurde erstellt`,
  });

  return NextResponse.json({ page }, { status: 201 });
}
