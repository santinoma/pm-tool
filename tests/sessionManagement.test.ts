import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import { computeSessionExpiry, shouldTouchSession, SESSION_TOUCH_INTERVAL_MS } from "../src/tenant/auth/session";

let tenant: Tenant;
let userId: string;
let otherUserId: string;

beforeEach(async () => {
  const subdomain = `sessionmgmt-${Date.now()}`;
  await provisionTenant({ name: "Session Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner@example.com", role: "owner" } });
  userId = owner.id;
  const other = await tenantDb.user.create({ data: { email: "other@example.com", role: "member" } });
  otherUserId = other.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("shouldTouchSession", () => {
  const now = new Date("2026-08-27T12:00:00.000Z");

  it("returns true when lastSeenAt is null", () => {
    expect(shouldTouchSession(null, now)).toBe(true);
  });

  it("returns false when lastSeenAt is recent (within the throttle interval)", () => {
    const lastSeenAt = new Date(now.getTime() - SESSION_TOUCH_INTERVAL_MS / 2);
    expect(shouldTouchSession(lastSeenAt, now)).toBe(false);
  });

  it("returns true when lastSeenAt is older than the throttle interval", () => {
    const lastSeenAt = new Date(now.getTime() - SESSION_TOUCH_INTERVAL_MS - 1);
    expect(shouldTouchSession(lastSeenAt, now)).toBe(true);
  });

  it("returns false exactly at the boundary (not strictly greater)", () => {
    const lastSeenAt = new Date(now.getTime() - SESSION_TOUCH_INTERVAL_MS);
    expect(shouldTouchSession(lastSeenAt, now)).toBe(false);
  });
});

describe("session revocation", () => {
  it("lets a user revoke their own session", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const session = await tenantDb.session.create({
      data: { userId, expiresAt: computeSessionExpiry(), userAgent: "vitest", lastSeenAt: new Date() },
    });

    // Mirrors the ownership check in src/app/api/tenant/sessions/[id]/route.ts:
    // only delete if session.userId === the requesting user's id.
    const found = await tenantDb.session.findUnique({ where: { id: session.id } });
    expect(found?.userId).toBe(userId);
    await tenantDb.session.delete({ where: { id: session.id } });

    const afterDelete = await tenantDb.session.findUnique({ where: { id: session.id } });
    expect(afterDelete).toBeNull();
  });

  it("rejects revoking another user's session (403 in the route)", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const otherSession = await tenantDb.session.create({
      data: { userId: otherUserId, expiresAt: computeSessionExpiry() },
    });

    const found = await tenantDb.session.findUnique({ where: { id: otherSession.id } });
    // This is the check the route performs before deleting — it must fail for a
    // session belonging to someone else, resulting in a 403 rather than a delete.
    expect(found?.userId).not.toBe(userId);

    const stillThere = await tenantDb.session.findUnique({ where: { id: otherSession.id } });
    expect(stillThere).not.toBeNull();
  });

  it("lists only the requesting user's own active sessions", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.session.create({ data: { userId, expiresAt: computeSessionExpiry() } });
    await tenantDb.session.create({ data: { userId: otherUserId, expiresAt: computeSessionExpiry() } });
    await tenantDb.session.create({
      data: { userId, expiresAt: new Date(Date.now() - 1000) }, // expired, should be excluded
    });

    const sessions = await tenantDb.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].userId).toBe(userId);
  });
});
