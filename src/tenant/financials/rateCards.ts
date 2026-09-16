import type { PrismaClient, RateCard } from "@/generated/tenant-client/client.js";

export async function getOrCreateDefaultRateCard(tenantDb: PrismaClient): Promise<RateCard> {
  const existing = await tenantDb.rateCard.findFirst({ where: { clientId: null, name: "Default Rate Card", archived: false } });
  if (existing) return existing;
  return tenantDb.rateCard.create({ data: { name: "Default Rate Card", clientId: null } });
}

/**
 * A client's own active rate card takes precedence over the tenant-wide default,
 * mirroring Productive.io's "company rate card overrides default" behavior.
 */
export async function getEffectiveRateCardItems(tenantDb: PrismaClient, clientId: string | null) {
  if (clientId) {
    const clientRateCard = await tenantDb.rateCard.findFirst({
      where: { clientId, archived: false },
      include: { items: { include: { serviceType: true }, orderBy: { name: "asc" } } },
    });
    if (clientRateCard) return clientRateCard.items;
  }
  const defaultRateCard = await getOrCreateDefaultRateCard(tenantDb);
  return tenantDb.rateCardItem.findMany({
    where: { rateCardId: defaultRateCard.id },
    include: { serviceType: true },
    orderBy: { name: "asc" },
  });
}
