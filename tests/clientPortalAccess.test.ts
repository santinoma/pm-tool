import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { hasProjectAccess } from "../src/tenant/portal/portalAccess";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;

beforeEach(async () => {
  const subdomain = `clientportal-${Date.now()}`;
  await provisionTenant({ name: "Client Portal Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const project = await tenantDb.project.create({ data: { name: "Project" } });
  projectId = project.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("client invite acceptance (mirrors POST /api/tenant/invites/[token]/accept)", () => {
  it("creates a ProjectClientAccess row for each granted project when a client invite is accepted", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const invite = await tenantDb.invite.create({
      data: {
        email: "client@example.com",
        token: "test-token",
        role: "client",
        grantedProjectIds: [projectId],
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const user = await tenantDb.user.create({
      data: { email: invite.email, name: "Client Contact", passwordHash: "hash", role: invite.role },
    });
    await tenantDb.projectClientAccess.createMany({
      data: invite.grantedProjectIds.map((id) => ({ projectId: id, userId: user.id })),
      skipDuplicates: true,
    });

    const access = await tenantDb.projectClientAccess.findMany({ where: { userId: user.id } });
    expect(access.map((a) => a.projectId)).toEqual([projectId]);
    expect(hasProjectAccess(access.map((a) => a.projectId), projectId)).toBe(true);
    expect(hasProjectAccess(access.map((a) => a.projectId), "some-other-project")).toBe(false);
  });
});
