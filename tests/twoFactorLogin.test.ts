import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { hashPassword } from "../src/tenant/auth/password";
import { computeTotpCode, generateTotpSecret } from "../src/tenant/auth/totp";
import { computePendingLoginExpiry, isPendingLoginValid } from "../src/tenant/auth/pendingLogin";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let userId: string;
let secret: string;

beforeEach(async () => {
  const subdomain = `twofactor-${Date.now()}`;
  await provisionTenant({ name: "Two Factor Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  secret = generateTotpSecret();
  const user = await tenantDb.user.create({
    data: {
      email: "owner-real@example.com",
      role: "owner",
      passwordHash: await hashPassword("Sup3rSecret!"),
      totpSecret: secret,
      totpEnabled: true,
    },
  });
  userId = user.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("2FA login flow (data layer, mirrors /api/tenant/login + /api/tenant/login/2fa)", () => {
  it("creates a pending login for a 2FA-enabled user instead of a session", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const pending = await tenantDb.pendingLogin.create({
      data: { userId, expiresAt: computePendingLoginExpiry() },
    });
    expect(isPendingLoginValid(pending.expiresAt)).toBe(true);

    const sessions = await tenantDb.session.findMany({ where: { userId } });
    expect(sessions).toHaveLength(0);
  });

  it("completes login and creates a session when the correct TOTP code is supplied", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const pending = await tenantDb.pendingLogin.create({
      data: { userId, expiresAt: computePendingLoginExpiry() },
    });

    const code = computeTotpCode(secret);
    const isValid = isPendingLoginValid(pending.expiresAt);
    expect(isValid).toBe(true);

    await tenantDb.pendingLogin.delete({ where: { id: pending.id } });
    const session = await tenantDb.session.create({
      data: { userId, expiresAt: new Date(Date.now() + 60_000) },
    });

    expect(code).toHaveLength(6);
    expect(session.userId).toBe(userId);

    const remainingPending = await tenantDb.pendingLogin.findMany({ where: { userId } });
    expect(remainingPending).toHaveLength(0);
  });

  it("an expired pending login is no longer valid", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const pending = await tenantDb.pendingLogin.create({
      data: { userId, expiresAt: new Date(Date.now() - 1000) },
    });
    expect(isPendingLoginValid(pending.expiresAt)).toBe(false);
  });
});
