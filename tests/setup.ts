import "dotenv/config";
import { Client } from "pg";
import { afterEach, beforeEach } from "vitest";

// Tests that call provisionTenant() create a real, physical Postgres database per
// tenant, but only ever clean up the platform Tenant *row* (see the repeated
// `platformDb.tenant.delete(...).catch(() => undefined)` pattern across this
// directory) — never the underlying `pmtool_tenant_*` database itself. Over many
// runs those orphaned databases silently accumulate and can fill the disk (this
// happened once already). Rather than touching every test file, diff the set of
// `pmtool_tenant_*` databases before/after each test and drop whatever appeared.
const adminConnectionString = process.env.PLATFORM_DATABASE_URL;

async function listTenantDbNames(): Promise<Set<string>> {
  if (!adminConnectionString) return new Set();
  const client = new Client({ connectionString: adminConnectionString });
  await client.connect();
  try {
    const result = await client.query<{ datname: string }>(
      "SELECT datname FROM pg_database WHERE datname LIKE 'pmtool\\_tenant\\_%' ESCAPE '\\'",
    );
    return new Set(result.rows.map((row) => row.datname));
  } finally {
    await client.end();
  }
}

let dbNamesBeforeTest = new Set<string>();

beforeEach(async () => {
  dbNamesBeforeTest = await listTenantDbNames();
});

afterEach(async () => {
  if (!adminConnectionString) return;
  const dbNamesAfterTest = await listTenantDbNames();
  const createdByThisTest = [...dbNamesAfterTest].filter((name) => !dbNamesBeforeTest.has(name));
  if (createdByThisTest.length === 0) return;

  const client = new Client({ connectionString: adminConnectionString });
  await client.connect();
  try {
    for (const name of createdByThisTest) {
      await client.query(`DROP DATABASE IF EXISTS "${name.replace(/"/g, '""')}"`).catch(() => undefined);
    }
  } finally {
    await client.end();
  }
});
