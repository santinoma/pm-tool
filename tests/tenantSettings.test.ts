import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { getOrCreateTenantSettings } from "../src/tenant/timeTracking/tenantSettings";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `tsettings-${Date.now()}`;
  await provisionTenant({ name: "Settings Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("getOrCreateTenantSettings", () => {
  it("creates a singleton row with allowProjectLevelTimeEntries defaulting to false", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const settings = await getOrCreateTenantSettings(tenantDb);
    expect(settings.allowProjectLevelTimeEntries).toBe(false);

    const all = await tenantDb.tenantSettings.findMany();
    expect(all).toHaveLength(1);
  });

  it("returns the same row on repeated calls instead of creating duplicates", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const first = await getOrCreateTenantSettings(tenantDb);
    const second = await getOrCreateTenantSettings(tenantDb);
    expect(first.id).toBe(second.id);

    const all = await tenantDb.tenantSettings.findMany();
    expect(all).toHaveLength(1);
  });
});
