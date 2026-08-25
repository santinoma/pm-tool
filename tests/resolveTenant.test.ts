import { afterEach, describe, expect, it } from "vitest";
import { extractSubdomain, resolveTenant } from "../src/tenant/resolveTenant";
import { platformDb } from "../src/platform/db";
import { createTenantRecord } from "../src/platform/tenantRegistry";

describe("extractSubdomain", () => {
  it("extracts the subdomain from a tenant host", () => {
    expect(extractSubdomain("kunde.localhost")).toBe("kunde");
    expect(extractSubdomain("kunde.localhost:3000")).toBe("kunde");
  });

  it("returns null for the bare base domain", () => {
    expect(extractSubdomain("localhost")).toBeNull();
    expect(extractSubdomain("localhost:3000")).toBeNull();
  });

  it("returns null for an unrelated host", () => {
    expect(extractSubdomain("example.com")).toBeNull();
  });
});

describe("resolveTenant", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    for (const id of createdIds.splice(0)) {
      await platformDb.tenant.delete({ where: { id } }).catch(() => undefined);
    }
  });

  it("resolves a known tenant subdomain to its tenant record", async () => {
    const subdomain = `resolve-${Date.now()}`;
    const tenant = await createTenantRecord({
      name: "Resolve Kunde",
      subdomain,
      dbUrl: "postgresql://pmtool:pmtool@localhost:5432/pmtool_test_placeholder",
    });
    createdIds.push(tenant.id);

    const resolved = await resolveTenant(`${subdomain}.localhost`);
    expect(resolved?.id).toBe(tenant.id);
  });

  it("returns null for an unknown subdomain", async () => {
    const resolved = await resolveTenant("does-not-exist.localhost");
    expect(resolved).toBeNull();
  });

  it("returns null for the admin domain without querying tenants", async () => {
    const resolved = await resolveTenant("admin.localhost");
    expect(resolved).toBeNull();
  });
});
