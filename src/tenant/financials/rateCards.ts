import type { PrismaClient, RateCard, RateCardItem, ServiceType } from "@/generated/tenant-client/client.js";

export async function getOrCreateDefaultRateCard(tenantDb: PrismaClient): Promise<RateCard> {
  const existing = await tenantDb.rateCard.findFirst({ where: { clientId: null, name: "Default Rate Card", archived: false } });
  if (existing) return existing;
  return tenantDb.rateCard.create({ data: { name: "Default Rate Card", clientId: null } });
}

export interface EffectiveRateCardItem {
  source: "client" | "default";
  item: RateCardItem & { serviceType: ServiceType | null };
}

/**
 * Productive.io zeigt beim Anlegen eines Services über "+ New from Rate Card"
 * immer BEIDE Optionen an, wenn der Kunde eine eigene Rate Card hat: die
 * kundenspezifische UND die Standard-Karte, nicht eine ersetzt durch die
 * andere ("Setting Up Rate Cards"). Die Client-Items werden zuerst gelistet.
 */
export async function getEffectiveRateCardItems(tenantDb: PrismaClient, clientId: string | null): Promise<EffectiveRateCardItem[]> {
  const defaultRateCard = await getOrCreateDefaultRateCard(tenantDb);
  const [clientRateCard, defaultItems] = await Promise.all([
    clientId
      ? tenantDb.rateCard.findFirst({
          where: { clientId, archived: false },
          include: { items: { include: { serviceType: true }, orderBy: { name: "asc" } } },
        })
      : Promise.resolve(null),
    tenantDb.rateCardItem.findMany({
      where: { rateCardId: defaultRateCard.id },
      include: { serviceType: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return [
    ...(clientRateCard?.items ?? []).map((item) => ({ source: "client" as const, item })),
    ...defaultItems.map((item) => ({ source: "default" as const, item })),
  ];
}
