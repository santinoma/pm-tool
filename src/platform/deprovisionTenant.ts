import { Client } from "pg";
import { deleteTenantRecord, getTenantById } from "./tenantRegistry";

export interface DeprovisionTenantResult {
  tenantId: string;
  subdomain: string;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function extractDbName(dbUrl: string): string {
  return new URL(dbUrl).pathname.replace(/^\//, "");
}

export async function deprovisionTenant(tenantId: string): Promise<DeprovisionTenantResult> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error("Tenant nicht gefunden.");
  }

  const adminConnectionString = process.env.PLATFORM_DATABASE_URL;
  if (!adminConnectionString) {
    throw new Error("PLATFORM_DATABASE_URL is not set");
  }

  const dbName = extractDbName(tenant.dbUrl);
  const client = new Client({ connectionString: adminConnectionString });
  await client.connect();
  try {
    await client.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [dbName],
    );
    await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(dbName)}`);
  } finally {
    await client.end();
  }

  await deleteTenantRecord(tenantId);
  return { tenantId: tenant.id, subdomain: tenant.subdomain };
}
