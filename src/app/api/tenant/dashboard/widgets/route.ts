import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { WIDGET_CATALOG, mergeWidgetPreferences } from "@/tenant/reporting/widgets";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const saved = await context.tenantDb.dashboardWidgetPreference.findMany({
    where: { userId: context.currentUser.id },
  });

  const widgets = mergeWidgetPreferences(WIDGET_CATALOG, saved);
  return NextResponse.json({ widgets });
}

export async function PATCH(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.widgetType !== "string") {
    return NextResponse.json({ error: "widgetType ist erforderlich." }, { status: 400 });
  }

  const preference = await context.tenantDb.dashboardWidgetPreference.upsert({
    where: { userId_widgetType: { userId: context.currentUser.id, widgetType: body.widgetType } },
    create: {
      userId: context.currentUser.id,
      widgetType: body.widgetType,
      enabled: typeof body.enabled === "boolean" ? body.enabled : true,
      position: typeof body.position === "number" ? body.position : 0,
    },
    update: {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      position: typeof body.position === "number" ? body.position : undefined,
    },
  });

  return NextResponse.json({ preference });
}
