import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let userAId: string;
let userBId: string;
let projectId: string;

beforeEach(async () => {
  const subdomain = `favorites-${Date.now()}`;
  await provisionTenant({ name: "Favorites Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const userA = await tenantDb.user.create({ data: { email: "a@example.com", role: "member" } });
  userAId = userA.id;
  const userB = await tenantDb.user.create({ data: { email: "b@example.com", role: "member" } });
  userBId = userB.id;
  const project = await tenantDb.project.create({ data: { name: "Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("favorites — idempotency", () => {
  it("favoriting the same entity twice does not create a duplicate row", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    await tenantDb.favorite.upsert({
      where: { userId_entityType_entityId: { userId: userAId, entityType: "project", entityId: projectId } },
      create: { userId: userAId, entityType: "project", entityId: projectId },
      update: {},
    });
    await tenantDb.favorite.upsert({
      where: { userId_entityType_entityId: { userId: userAId, entityType: "project", entityId: projectId } },
      create: { userId: userAId, entityType: "project", entityId: projectId },
      update: {},
    });

    const favorites = await tenantDb.favorite.findMany({ where: { userId: userAId } });
    expect(favorites).toHaveLength(1);
  });
});

describe("favorites — ownership", () => {
  it("a user can only see and remove their own favorites", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    await tenantDb.favorite.create({ data: { userId: userAId, entityType: "project", entityId: projectId } });
    await tenantDb.favorite.create({ data: { userId: userBId, entityType: "project", entityId: projectId } });

    const userAFavorites = await tenantDb.favorite.findMany({ where: { userId: userAId } });
    expect(userAFavorites).toHaveLength(1);
    expect(userAFavorites[0].userId).toBe(userAId);

    // userB tries to delete userA's favorite by id, scoped to their own userId — must not
    // remove it (mirrors the DELETE /api/tenant/favorites/[id] route's ownership filter).
    const result = await tenantDb.favorite.deleteMany({
      where: { id: userAFavorites[0].id, userId: userBId },
    });
    expect(result.count).toBe(0);

    const stillThere = await tenantDb.favorite.findMany({ where: { userId: userAId } });
    expect(stillThere).toHaveLength(1);

    // userA deleting their own favorite succeeds.
    const ownRemoval = await tenantDb.favorite.deleteMany({
      where: { id: userAFavorites[0].id, userId: userAId },
    });
    expect(ownRemoval.count).toBe(1);
  });
});
