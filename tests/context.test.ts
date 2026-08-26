import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { resolveTenantContext } from "../src/tenant/context";
import { computeSessionExpiry } from "../src/tenant/auth/session";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let subdomain: string;

beforeEach(async () => {
  subdomain = `ctx-${Date.now()}`;
  await provisionTenant({ name: "Context Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("resolveTenantContext", () => {
  it("returns null when subdomain or tenantId is missing", async () => {
    expect(await resolveTenantContext(null, tenant.id, undefined)).toBeNull();
    expect(await resolveTenantContext(subdomain, null, undefined)).toBeNull();
  });

  it("returns null when the tenantId does not match the resolved subdomain", async () => {
    const result = await resolveTenantContext(subdomain, "wrong-id", undefined);
    expect(result).toBeNull();
  });

  it("returns a context with currentUser null when there is no session", async () => {
    const result = await resolveTenantContext(subdomain, tenant.id, undefined);
    expect(result).not.toBeNull();
    expect(result?.currentUser).toBeNull();
  });

  it("returns the current user for a valid, unexpired session", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const user = await tenantDb.user.create({
      data: { email: "member@example.com", role: "member" },
    });
    const session = await tenantDb.session.create({
      data: { userId: user.id, expiresAt: computeSessionExpiry() },
    });

    const result = await resolveTenantContext(subdomain, tenant.id, session.id);
    expect(result?.currentUser?.id).toBe(user.id);
  });

  it("returns currentUser null for an expired session", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const user = await tenantDb.user.create({
      data: { email: "expired@example.com", role: "member" },
    });
    const session = await tenantDb.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await resolveTenantContext(subdomain, tenant.id, session.id);
    expect(result?.currentUser).toBeNull();
  });
});
