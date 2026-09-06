import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateDashboards } from "@/tenant/reporting/dashboards";
import { WIDGET_CATALOG } from "@/tenant/reporting/widgets";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const dashboards = await getOrCreateDashboards(context, context.currentUser.id);
  return NextResponse.json({ dashboards });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name ist erforderlich." }, { status: 400 });
  }

  const existingCount = await context.tenantDb.dashboard.count({ where: { ownerId: context.currentUser.id } });
  const startEmpty = body?.startEmpty === true;

  const dashboard = await context.tenantDb.dashboard.create({
    data: {
      name,
      ownerId: context.currentUser.id,
      isDefault: existingCount === 0,
      position: existingCount,
      widgets: startEmpty
        ? undefined
        : {
            create: WIDGET_CATALOG.map((entry, index) => ({
              widgetType: entry.type,
              enabled: true,
              position: index,
              span: entry.defaultSpan,
            })),
          },
    },
  });

  return NextResponse.json({ dashboard }, { status: 201 });
}
