import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { recordActivity } from "@/tenant/notifications/recordActivity";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const page = await context.tenantDb.wikiPage.update({
    where: { id },
    data: {
      title: typeof body.title === "string" ? body.title : undefined,
      content: typeof body.content === "string" ? body.content : undefined,
    },
  });

  await recordActivity(context.tenantDb, {
    projectId: page.projectId,
    actorId: context.currentUser.id,
    type: "wiki_page_updated",
    summary: `Wiki-Seite „${page.title}“ wurde bearbeitet`,
  });

  return NextResponse.json({ page });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  await context.tenantDb.wikiPage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
