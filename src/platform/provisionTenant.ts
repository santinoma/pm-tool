import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "pg";
import { validateSubdomain } from "./validateSubdomain";
import { createTenantRecord, getTenantBySubdomain, updateTenantStatus } from "./tenantRegistry";
import type { TenantPlan } from "./tenantRegistry";
import { getTenantDbClient } from "../tenant/tenantDb";
import { buildInviteUrl, computeInviteExpiry, generateInviteToken } from "../tenant/auth/invite";
import { computeEntitledFeatures } from "../tenant/entitlements/features";

const execFileAsync = promisify(execFile);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ProvisionTenantInput {
  name: string;
  subdomain: string;
  ownerEmail: string;
  targetConnectionString?: string;
  plan?: TenantPlan;
  addOnFeatures?: string[];
}

export interface ProvisionTenantResult {
  tenantId: string;
  subdomain: string;
  status: "active" | "failed";
  error?: string;
  inviteUrl?: string;
}

function buildTenantDbName(subdomain: string): string {
  // subdomain ist bereits gegen [a-z0-9-]{3,63} validiert — sicherer Zeichensatz für einen
  // Postgres-Identifier. Trotzdem wird beim eigentlichen SQL nie roh interpoliert (siehe quoteIdentifier).
  return `pmtool_tenant_${subdomain.replace(/-/g, "_")}`;
}

function quoteIdentifier(identifier: string): string {
  // Verteidigung in der Tiefe: auch wenn nur validierte, selbst generierte Namen ankommen,
  // wird nie rohe String-Konkatenation ins SQL übernommen, sondern korrekt gequotet/escaped.
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function runOnAdminConnection(
  adminConnectionString: string,
  fn: (client: Client) => Promise<void>,
): Promise<void> {
  const client = new Client({ connectionString: adminConnectionString });
  await client.connect();
  try {
    await fn(client);
  } finally {
    await client.end();
  }
}

function buildTenantDbUrl(adminConnectionString: string, dbName: string): string {
  const url = new URL(adminConnectionString);
  url.pathname = `/${dbName}`;
  return url.toString();
}

async function migrateTenantDatabase(tenantDbUrl: string): Promise<void> {
  await execFileAsync(
    "npx",
    ["prisma", "migrate", "deploy", "--config", "prisma.tenant.config.ts"],
    {
      cwd: process.cwd(),
      env: { ...process.env, TENANT_DATABASE_URL: tenantDbUrl },
    },
  );
}

export async function provisionTenant(
  input: ProvisionTenantInput,
): Promise<ProvisionTenantResult> {
  const validation = validateSubdomain(input.subdomain);
  if (!validation.valid) {
    throw new Error(validation.reason ?? "Ungültige Subdomain");
  }
  if (!EMAIL_PATTERN.test(input.ownerEmail)) {
    throw new Error("Ungültige Owner-E-Mail-Adresse.");
  }

  const existing = await getTenantBySubdomain(input.subdomain);
  if (existing) {
    throw new Error(`Subdomain "${input.subdomain}" ist bereits vergeben.`);
  }

  const defaultAdminConnectionString = process.env.PLATFORM_DATABASE_URL;
  if (!defaultAdminConnectionString) {
    throw new Error("PLATFORM_DATABASE_URL is not set");
  }
  const adminConnectionString = input.targetConnectionString ?? defaultAdminConnectionString;
  const tier = input.targetConnectionString ? "dedicated" : "shared";
  const plan = input.plan ?? "small";
  const addOnFeatures = input.addOnFeatures ?? [];

  if (tier === "dedicated" && !computeEntitledFeatures(plan, addOnFeatures).has("dedicated_infra")) {
    throw new Error("Dedizierte Infrastruktur ist nur im Enterprise-Plan verfügbar.");
  }

  const dbName = buildTenantDbName(input.subdomain);
  const tenantDbUrl = buildTenantDbUrl(adminConnectionString, dbName);

  const record = await createTenantRecord({
    name: input.name,
    subdomain: input.subdomain,
    dbUrl: tenantDbUrl,
    status: "provisioning",
    tier,
    plan,
    addOnFeatures,
  });

  try {
    await runOnAdminConnection(adminConnectionString, (client) =>
      client.query(`CREATE DATABASE ${quoteIdentifier(dbName)}`).then(() => undefined),
    );
    await migrateTenantDatabase(tenantDbUrl);

    const token = generateInviteToken();
    const tenantDb = getTenantDbClient(tenantDbUrl);
    await tenantDb.invite.create({
      data: {
        email: input.ownerEmail,
        token,
        role: "owner",
        expiresAt: computeInviteExpiry(),
      },
    });
    const inviteUrl = buildInviteUrl(
      process.env.BASE_DOMAIN ?? "localhost",
      input.subdomain,
      token,
    );

    const updated = await updateTenantStatus(record.id, "active");
    return { tenantId: updated.id, subdomain: updated.subdomain, status: "active", inviteUrl };
  } catch (error) {
    await runOnAdminConnection(adminConnectionString, (client) =>
      client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(dbName)}`).then(() => undefined),
    ).catch(() => undefined);
    await updateTenantStatus(record.id, "failed").catch(() => undefined);
    return {
      tenantId: record.id,
      subdomain: record.subdomain,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
