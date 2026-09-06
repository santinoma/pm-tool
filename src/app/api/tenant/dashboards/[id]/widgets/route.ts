import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { WIDGET_CATALOG_BY_TYPE } from "@/tenant/reporting/widgets";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const dashboard = await context.tenantDb.dashboard.findUnique({ where: { id } });
  if (!dashboard || dashboard.ownerId !== context.currentUser.id) {
    return NextResponse.json({ error: "Dashboard nicht gefunden." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const widgetType = typeof body?.widgetType === "string" ? body.widgetType : "";
  const catalogEntry = WIDGET_CATALOG_BY_TYPE.get(widgetType as never);
  if (!catalogEntry) {
    return NextResponse.json({ error: "Unbekannter Widget-Typ." }, { status: 400 });
  }

  const maxPosition = await context.tenantDb.dashboardWidget.aggregate({
    where: { dashboardId: id },
    _max: { position: true },
  });

  const widget = await context.tenantDb.dashboardWidget.create({
    data: {
      dashboardId: id,
      widgetType: catalogEntry.type,
      enabled: true,
      position: (maxPosition._max.position ?? -1) + 1,
      span: catalogEntry.defaultSpan,
    },
  });

  return NextResponse.json({ widget }, { status: 201 });
}
