import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { isSharedViewValid } from "../src/tenant/sharedViews/sharedViewAccess";
import { generateInviteToken } from "../src/tenant/auth/invite";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let ownerId: string;
let projectId: string;

beforeEach(async () => {
  const subdomain = `sharedviews-${Date.now()}`;
  await provisionTenant({ name: "Shared Views Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  ownerId = owner.id;
  const project = await tenantDb.project.create({ data: { name: "Project" } });
  projectId = project.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("shared views (data layer, mirrors the API route logic)", () => {
  it("a freshly created view is valid and findable by its token alone", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const view = await tenantDb.sharedView.create({
      data: { projectId, token: generateInviteToken(), createdById: ownerId },
    });

    const found = await tenantDb.sharedView.findUnique({ where: { token: view.token } });
    expect(found).not.toBeNull();
    expect(isSharedViewValid(found!).valid).toBe(true);
  });

  it("becomes invalid after being revoked", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const view = await tenantDb.sharedView.create({
      data: { projectId, token: generateInviteToken(), createdById: ownerId },
    });

    const revoked = await tenantDb.sharedView.update({
      where: { id: view.id },
      data: { revokedAt: new Date() },
    });

    expect(isSharedViewValid(revoked).valid).toBe(false);
    expect(isSharedViewValid(revoked).reason).toBe("revoked");
  });
});
