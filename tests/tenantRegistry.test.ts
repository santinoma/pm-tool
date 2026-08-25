import { afterEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import {
  createTenantRecord,
  getTenantBySubdomain,
  listTenants,
  updateTenantStatus,
} from "../src/platform/tenantRegistry";

const createdIds: string[] = [];

afterEach(async () => {
  for (const id of createdIds.splice(0)) {
    await platformDb.tenant.delete({ where: { id } }).catch(() => undefined);
  }
});

describe("tenantRegistry", () => {
  it("creates a tenant record with default status 'provisioning'", async () => {
    const tenant = await createTenantRecord({
      name: "Test Kunde",
      subdomain: `test-${Date.now()}`,
      dbUrl: "postgresql://pmtool:pmtool@localhost:5432/pmtool_test_placeholder",
    });
    createdIds.push(tenant.id);

    expect(tenant.status).toBe("provisioning");
    expect(tenant.name).toBe("Test Kunde");
  });

  it("finds a tenant by subdomain", async () => {
    const subdomain = `test-${Date.now()}-lookup`;
    const tenant = await createTenantRecord({
      name: "Lookup Kunde",
      subdomain,
      dbUrl: "postgresql://pmtool:pmtool@localhost:5432/pmtool_test_placeholder",
    });
    createdIds.push(tenant.id);

    const found = await getTenantBySubdomain(subdomain);
    expect(found?.id).toBe(tenant.id);
  });

  it("returns null for an unknown subdomain", async () => {
    const found = await getTenantBySubdomain("does-not-exist-subdomain");
    expect(found).toBeNull();
  });

  it("updates tenant status", async () => {
    const tenant = await createTenantRecord({
      name: "Status Kunde",
      subdomain: `test-${Date.now()}-status`,
      dbUrl: "postgresql://pmtool:pmtool@localhost:5432/pmtool_test_placeholder",
    });
    createdIds.push(tenant.id);

    const updated = await updateTenantStatus(tenant.id, "active");
    expect(updated.status).toBe("active");
  });

  it("lists tenants including newly created ones", async () => {
    const tenant = await createTenantRecord({
      name: "List Kunde",
      subdomain: `test-${Date.now()}-list`,
      dbUrl: "postgresql://pmtool:pmtool@localhost:5432/pmtool_test_placeholder",
    });
    createdIds.push(tenant.id);

    const tenants = await listTenants();
    expect(tenants.some((t) => t.id === tenant.id)).toBe(true);
  });
});
