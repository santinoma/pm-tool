import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";

async function loadOwnedWidget(context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>, id: string) {
  const widget = await context.tenantDb.dashboardWidget.findUnique({ where: { id }, include: { dashboard: true } });
  if (!widget || widget.dashboard.ownerId !== context.currentUser!.id) return null;
  return widget;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const widget = await loadOwnedWidget(context, id);
  if (!widget) {
    return NextResponse.json({ error: "Widget nicht gefunden." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { enabled, position, span, title, filterProjectId } = body as {
    enabled?: boolean;
    position?: number;
    span?: number;
    title?: string | null;
    filterProjectId?: string | null;
  };

  const updated = await context.tenantDb.dashboardWidget.update({
    where: { id },
    data: {
      enabled: typeof enabled === "boolean" ? enabled : undefined,
      position: typeof position === "number" ? position : undefined,
      span: span === 1 || span === 2 ? span : undefined,
      title: title === null ? null : typeof title === "string" ? title.trim() || null : undefined,
      filterProjectId: filterProjectId === null ? null : typeof filterProjectId === "string" ? filterProjectId : undefined,
    },
  });

  return NextResponse.json({ widget: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const widget = await loadOwnedWidget(context, id);
  if (!widget) {
    return NextResponse.json({ error: "Widget nicht gefunden." }, { status: 404 });
  }

  await context.tenantDb.dashboardWidget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
