import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { getEffectiveRateCardItems, getOrCreateDefaultRateCard } from "../src/tenant/financials/rateCards";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient } from "../src/generated/tenant-client/client.js";

let tenant: Tenant;
let tenantDb: PrismaClient;
let clientId: string;

beforeEach(async () => {
  const subdomain = `ratecards-${Date.now()}`;
  await provisionTenant({ name: "Rate Cards Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  const client = await tenantDb.client.create({ data: { name: "Acme Corp" } });
  clientId = client.id;

  // provisionTenant seeds a "Default Rate Card" already — reuse it instead of
  // creating a second one (getOrCreateDefaultRateCard would just pick one of
  // the two arbitrarily, which isn't what these tests want to exercise).
  const defaultCard = await getOrCreateDefaultRateCard(tenantDb);
  await tenantDb.rateCardItem.create({
    data: { rateCardId: defaultCard.id, name: "Standard Dev", defaultPrice: 100 },
  });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("getEffectiveRateCardItems", () => {
  it("returns only the default rate card when the client has none", async () => {
    const result = await getEffectiveRateCardItems(tenantDb, clientId);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("default");
  });

  it("returns BOTH the client-specific and the default rate card, client first", async () => {
    const clientCard = await tenantDb.rateCard.create({ data: { name: "Acme Rate Card", clientId } });
    await tenantDb.rateCardItem.create({
      data: { rateCardId: clientCard.id, name: "Acme Dev", defaultPrice: 150 },
    });

    const result = await getEffectiveRateCardItems(tenantDb, clientId);
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("client");
    expect(result[0].item.name).toBe("Acme Dev");
    expect(result[1].source).toBe("default");
    expect(result[1].item.name).toBe("Standard Dev");
  });

  it("ignores an archived client rate card", async () => {
    const archivedCard = await tenantDb.rateCard.create({ data: { name: "Old Acme Card", clientId, archived: true } });
    await tenantDb.rateCardItem.create({ data: { rateCardId: archivedCard.id, name: "Old Dev", defaultPrice: 80 } });

    const result = await getEffectiveRateCardItems(tenantDb, clientId);
    expect(result.every((r) => r.source === "default")).toBe(true);
  });

  it("returns only the default rate card when no client is given", async () => {
    const result = await getEffectiveRateCardItems(tenantDb, null);
    expect(result.every((r) => r.source === "default")).toBe(true);
  });
});
