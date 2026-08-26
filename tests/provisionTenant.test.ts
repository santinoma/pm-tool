import { afterEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";

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

    const result = await provisionTenant({
      name: "Integrationstest Kunde",
      subdomain,
      ownerEmail: "owner@example.com",
    });

    expect(result.status).toBe("active");

    const dbName = `pmtool_tenant_${subdomain.replace(/-/g, "_")}`;
    expect(await databaseExists(dbName)).toBe(true);

    const record = await getTenantBySubdomain(subdomain);
    expect(record?.status).toBe("active");
  }, 30000);

  it("creates an owner invite in the new tenant database and returns its link", async () => {
    const subdomain = `it-invite-${Date.now()}`;
    createdSubdomains.push(subdomain);

    const result = await provisionTenant({
      name: "Invite Kunde",
      subdomain,
      ownerEmail: "owner@example.com",
    });

    expect(result.inviteUrl).toContain(`${subdomain}.localhost/accept-invite/`);

    const record = await getTenantBySubdomain(subdomain);
    const tenantDb = getTenantDbClient(record!.dbUrl);
    const invites = await tenantDb.invite.findMany();

    expect(invites).toHaveLength(1);
    expect(invites[0].email).toBe("owner@example.com");
    expect(invites[0].role).toBe("owner");
  }, 30000);

  it("rejects a duplicate subdomain without creating a second database", async () => {
    const subdomain = `it-dup-${Date.now()}`;
    createdSubdomains.push(subdomain);

    await provisionTenant({ name: "Erster Kunde", subdomain, ownerEmail: "owner@example.com" });

    await expect(
      provisionTenant({ name: "Zweiter Kunde", subdomain, ownerEmail: "owner2@example.com" }),
    ).rejects.toThrow(/bereits vergeben/);
  }, 30000);

  it("rejects an invalid subdomain before touching the database", async () => {
    await expect(
      provisionTenant({
        name: "Ungültig",
        subdomain: "NOT_VALID!",
        ownerEmail: "owner@example.com",
      }),
    ).rejects.toThrow();

    const record = await getTenantBySubdomain("NOT_VALID!");
    expect(record).toBeNull();
  });

  it("rejects an invalid owner email before touching the database", async () => {
    const subdomain = `it-bademail-${Date.now()}`;

    await expect(
      provisionTenant({ name: "Kunde", subdomain, ownerEmail: "not-an-email" }),
    ).rejects.toThrow(/E-Mail/);

    const record = await getTenantBySubdomain(subdomain);
    expect(record).toBeNull();
  });
});
