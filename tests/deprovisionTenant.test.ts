import { afterEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import { provisionTenant } from "../src/platform/provisionTenant";
import { deprovisionTenant } from "../src/platform/deprovisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";

const createdSubdomains: string[] = [];

async function databaseExists(dbName: string): Promise<boolean> {
  const client = new Client({ connectionString: process.env.PLATFORM_DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    return result.rowCount !== null && result.rowCount > 0;
  } finally {
    await client.end();
  }
}

async function dropDatabase(dbName: string): Promise<void> {
  const client = new Client({ connectionString: process.env.PLATFORM_DATABASE_URL });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  } finally {
    await client.end();
  }
}

afterEach(async () => {
  for (const subdomain of createdSubdomains.splice(0)) {
    await dropDatabase(`pmtool_tenant_${subdomain.replace(/-/g, "_")}`).catch(() => undefined);
  }
});

describe("deprovisionTenant", () => {
  it("drops the tenant's database and removes its platform record", async () => {
    const subdomain = `deprov-${Date.now()}`;
    createdSubdomains.push(subdomain);
    const provisioned = await provisionTenant({
      name: "Zu löschender Kunde",
      subdomain,
      ownerEmail: "owner@example.com",
    });
    const dbName = `pmtool_tenant_${subdomain.replace(/-/g, "_")}`;
    expect(await databaseExists(dbName)).toBe(true);

    const result = await deprovisionTenant(provisioned.tenantId);
    expect(result.subdomain).toBe(subdomain);

    expect(await databaseExists(dbName)).toBe(false);
    expect(await getTenantBySubdomain(subdomain)).toBeNull();
  }, 30000);

  it("throws for an unknown tenant id", async () => {
    await expect(deprovisionTenant("00000000-0000-0000-0000-000000000000")).rejects.toThrow(/nicht gefunden/);
  });
});
