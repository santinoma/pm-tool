import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { recordActivity } from "@/tenant/notifications/recordActivity";
import { assertSingleProjectAccess } from "@/tenant/projectAccess/assertProjectAccess";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const existing = await context.tenantDb.wikiPage.findUnique({ where: { id }, select: { projectId: true } });
  if (!existing) {
    return NextResponse.json({ error: "Seite nicht gefunden." }, { status: 404 });
  }
  const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, existing.projectId);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const page = await context.tenantDb.wikiPage.update({
    where: { id },
    data: {
      title: typeof body.title === "string" ? body.title : undefined,
      content: typeof body.content === "string" ? body.content : undefined,
      isTemplate: typeof body.isTemplate === "boolean" ? body.isTemplate : undefined,
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
  const existing = await context.tenantDb.wikiPage.findUnique({ where: { id }, select: { projectId: true } });
  if (!existing) {
    return NextResponse.json({ error: "Seite nicht gefunden." }, { status: 404 });
  }
  const denied = await assertSingleProjectAccess(context.tenantDb, context.currentUser, existing.projectId);
  if (denied) return denied;

  await context.tenantDb.wikiPage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
