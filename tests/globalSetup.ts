import "dotenv/config";
import { Client } from "pg";

// Tests that call provisionTenant() create a real, physical Postgres database per
// tenant, but every afterEach in this directory only ever cleaned up the platform
// Tenant *row* — never the underlying pmtool_tenant_* database itself. Over many
// runs those orphaned databases silently accumulated (2332 of them, ~23GB) and
// filled the sandbox disk, taking Postgres down mid-session.
//
// This must be a Vitest `globalSetup` (not `setupFiles`): globalSetup runs exactly
// once for the whole run, before any worker starts and after every worker has
// finished, so the before/after database-name diff can never race against a test
// that's still using its own tenant database in a different worker — a per-test or
// per-file hook (in setupFiles, which loads once per worker) can't make that
// guarantee, since other workers are still mid-test when any single worker's hook
// fires.
export default async function setup() {
  const adminConnectionString = process.env.PLATFORM_DATABASE_URL;
  if (!adminConnectionString) return;

  const client = new Client({ connectionString: adminConnectionString });
  await client.connect();
  const before = await listTenantDbNames(client);
  await client.end();

  return async () => {
    const teardownClient = new Client({ connectionString: adminConnectionString });
    await teardownClient.connect();
    try {
      const after = await listTenantDbNames(teardownClient);
      const createdDuringRun = [...after].filter((name) => !before.has(name));
      for (const name of createdDuringRun) {
        await teardownClient
          .query(`DROP DATABASE IF EXISTS "${name.replace(/"/g, '""')}" WITH (FORCE)`)
          .catch(() => undefined);
      }
    } finally {
      await teardownClient.end();
    }
  };
}

async function listTenantDbNames(client: Client): Promise<Set<string>> {
  const result = await client.query<{ datname: string }>(
    "SELECT datname FROM pg_database WHERE datname LIKE 'pmtool\\_tenant\\_%' ESCAPE '\\'",
  );
  return new Set(result.rows.map((row) => row.datname));
}
