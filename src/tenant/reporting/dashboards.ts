import type { getTenantContext } from "@/tenant/context";
import { WIDGET_CATALOG } from "./widgets";

type TenantContext = NonNullable<Awaited<ReturnType<typeof getTenantContext>>>;

export async function getOrCreateDashboards(context: TenantContext, ownerId: string) {
  const existing = await context.tenantDb.dashboard.findMany({
    where: { ownerId },
    orderBy: { position: "asc" },
    include: { widgets: { orderBy: { position: "asc" } } },
  });
  if (existing.length > 0) return existing;

  const created = await context.tenantDb.dashboard.create({
    data: {
      name: "Mein Dashboard",
      ownerId,
      isDefault: true,
      position: 0,
      widgets: {
        create: WIDGET_CATALOG.map((entry, index) => ({
          widgetType: entry.type,
          enabled: true,
          position: index,
          span: entry.defaultSpan,
        })),
      },
    },
    include: { widgets: { orderBy: { position: "asc" } } },
  });
  return [created];
}
