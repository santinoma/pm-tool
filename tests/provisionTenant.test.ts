import { afterEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
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
    const tenant = await getTenantBySubdomain(subdomain);
    if (tenant) {
      await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    }
    await dropDatabase(`pmtool_tenant_${subdomain.replace(/-/g, "_")}`).catch(() => undefined);
  }
});

describe("provisionTenant", () => {
  it("creates a real, migrated database and an 'active' tenant record", async () => {
    const subdomain = `it-${Date.now()}`;
    createdSubdomains.push(subdomain);

    const result = await provisionTenant({ name: "Integrationstest Kunde", subdomain });

    expect(result.status).toBe("active");

    const dbName = `pmtool_tenant_${subdomain.replace(/-/g, "_")}`;
    expect(await databaseExists(dbName)).toBe(true);

    const record = await getTenantBySubdomain(subdomain);
    expect(record?.status).toBe("active");
  }, 30000);

  it("rejects a duplicate subdomain without creating a second database", async () => {
    const subdomain = `it-dup-${Date.now()}`;
    createdSubdomains.push(subdomain);

    await provisionTenant({ name: "Erster Kunde", subdomain });

    await expect(provisionTenant({ name: "Zweiter Kunde", subdomain })).rejects.toThrow(
      /bereits vergeben/,
    );
  }, 30000);

  it("rejects an invalid subdomain before touching the database", async () => {
    await expect(
      provisionTenant({ name: "Ungültig", subdomain: "NOT_VALID!" }),
    ).rejects.toThrow();

    const record = await getTenantBySubdomain("NOT_VALID!");
    expect(record).toBeNull();
  });
});
