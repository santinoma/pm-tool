import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { generateApiKey, hashApiKeyToken } from "../src/tenant/apiKeys/apiKeyToken";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let userId: string;

beforeEach(async () => {
  const subdomain = `apikey-${Date.now()}`;
  await provisionTenant({ name: "Api Key Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const user = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  userId = user.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("API key lifecycle (data layer, mirrors authenticateApiKey())", () => {
  it("a stored hash matches the generated token's hash and can be looked up", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const generated = generateApiKey();
    const key = await tenantDb.apiKey.create({
      data: { name: "CI Integration", tokenHash: generated.tokenHash, tokenPrefix: generated.tokenPrefix, userId },
    });

    const found = await tenantDb.apiKey.findUnique({ where: { tokenHash: hashApiKeyToken(generated.token) } });
    expect(found?.id).toBe(key.id);
    expect(found?.revokedAt).toBeNull();
  });

  it("a revoked key is no longer usable for lookup-based auth", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const generated = generateApiKey();
    const key = await tenantDb.apiKey.create({
      data: { name: "CI Integration", tokenHash: generated.tokenHash, tokenPrefix: generated.tokenPrefix, userId },
    });

    await tenantDb.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });

    const found = await tenantDb.apiKey.findUnique({ where: { tokenHash: generated.tokenHash } });
    expect(found?.revokedAt).not.toBeNull();
  });

  it("a wrong token hashes to a different value and finds nothing", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const generated = generateApiKey();
    await tenantDb.apiKey.create({
      data: { name: "CI Integration", tokenHash: generated.tokenHash, tokenPrefix: generated.tokenPrefix, userId },
    });

    const found = await tenantDb.apiKey.findUnique({ where: { tokenHash: hashApiKeyToken("wrong-token") } });
    expect(found).toBeNull();
  });
});
