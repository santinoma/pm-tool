import { afterEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";

const createdSubdomains: string[] = [];

async function dropDatabase(connectionString: string, dbName: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  } finally {
    await client.end();
  }
}

afterEach(async () => {
  for (const subdomain of createdSubdomains.splice(0)) {
    const tenant = await getTenantBySubdomain(subdomain);
    if (tenant) {
      await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    }
    const dbName = `pmtool_tenant_${subdomain.replace(/-/g, "_")}`;
    await dropDatabase(process.env.PLATFORM_DATABASE_URL!, dbName).catch(() => undefined);
  }
});

describe("tiered tenant provisioning", () => {
  it("defaults to the 'shared' tier and the default connection string when no target is given", async () => {
    const subdomain = `tier-shared-${Date.now()}`;
    createdSubdomains.push(subdomain);

    const result = await provisionTenant({ name: "Shared Kunde", subdomain, ownerEmail: "owner@example.com" });
    expect(result.status).toBe("active");

    const record = await getTenantBySubdomain(subdomain);
    expect(record?.tier).toBe("shared");
    const dbUrlHost = new URL(record!.dbUrl).host;
    const defaultHost = new URL(process.env.PLATFORM_DATABASE_URL!).host;
    expect(dbUrlHost).toBe(defaultHost);
  });

  it("provisions against the given targetConnectionString and records the 'dedicated' tier", async () => {
    const subdomain = `tier-dedicated-${Date.now()}`;
    createdSubdomains.push(subdomain);

    // Only one Postgres server exists in this environment — reuse the same admin connection
    // string as the "dedicated" target to prove the plumbing routes to whatever is given,
    // not that it's physically a different server.
    const targetConnectionString = process.env.PLATFORM_DATABASE_URL!;

    const result = await provisionTenant({
      name: "Dedicated Kunde",
      subdomain,
      ownerEmail: "owner@example.com",
      targetConnectionString,
      plan: "enterprise",
    });
    expect(result.status).toBe("active");

    const record = await getTenantBySubdomain(subdomain);
    expect(record?.tier).toBe("dedicated");
  });

  it("rejects a dedicated target when the plan is not enterprise", async () => {
    const subdomain = `tier-dedicated-rejected-${Date.now()}`;

    await expect(
      provisionTenant({
        name: "Should Fail",
        subdomain,
        ownerEmail: "owner@example.com",
        targetConnectionString: process.env.PLATFORM_DATABASE_URL!,
        plan: "small",
      }),
    ).rejects.toThrow(/Enterprise-Plan/);

    const record = await getTenantBySubdomain(subdomain);
    expect(record).toBeNull();
  });
});
