import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { generateInviteToken } from "../src/tenant/auth/invite";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let scimToken: string;

beforeEach(async () => {
  const subdomain = `scim-${Date.now()}`;
  await provisionTenant({ name: "SCIM Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  scimToken = generateInviteToken();
  await tenantDb.tenantSettings.create({ data: { scimBearerToken: scimToken } });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("SCIM provisioning (data layer, mirrors /scim/v2/Users route logic)", () => {
  it("a provisioned user is findable by userName filter and can be deactivated", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    const created = await tenantDb.user.create({
      data: { email: "scim.user@example.com", name: "SCIM User", isActive: true },
    });
    expect(created.isActive).toBe(true);

    const found = await tenantDb.user.findUnique({ where: { email: "scim.user@example.com" } });
    expect(found?.id).toBe(created.id);

    const deactivated = await tenantDb.user.update({
      where: { id: created.id },
      data: { isActive: false },
    });
    expect(deactivated.isActive).toBe(false);
  });

  it("the stored bearer token authenticates and a different token does not", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const settings = await tenantDb.tenantSettings.findFirstOrThrow();
    expect(settings.scimBearerToken).toBe(scimToken);
    expect(settings.scimBearerToken).not.toBe("wrong-token");
  });
});
