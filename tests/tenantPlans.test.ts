import { afterEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain, updateTenantStatus } from "../src/platform/tenantRegistry";

const createdSubdomains: string[] = [];

afterEach(async () => {
  for (const subdomain of createdSubdomains.splice(0)) {
    const tenant = await getTenantBySubdomain(subdomain);
    if (tenant) {
      await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    }
  }
});

describe("tenant plan + status lifecycle", () => {
  it("provisions a tenant with a chosen plan and add-on features", async () => {
    const subdomain = `plan-small-addon-${Date.now()}`;
    createdSubdomains.push(subdomain);

    await provisionTenant({
      name: "Small With Addon",
      subdomain,
      ownerEmail: "owner@example.com",
      plan: "small",
      addOnFeatures: ["two_factor_scim"],
    });

    const record = await getTenantBySubdomain(subdomain);
    expect(record?.plan).toBe("small");
    expect(record?.addOnFeatures).toEqual(["two_factor_scim"]);
  });

  it("defaults to the small plan when none is given", async () => {
    const subdomain = `plan-default-${Date.now()}`;
    createdSubdomains.push(subdomain);

    await provisionTenant({ name: "Default Plan", subdomain, ownerEmail: "owner@example.com" });

    const record = await getTenantBySubdomain(subdomain);
    expect(record?.plan).toBe("small");
    expect(record?.addOnFeatures).toEqual([]);
  });

  it("toggles a tenant between active and disabled without losing its record", async () => {
    const subdomain = `plan-toggle-${Date.now()}`;
    createdSubdomains.push(subdomain);

    await provisionTenant({ name: "Toggle Me", subdomain, ownerEmail: "owner@example.com", plan: "medium" });
    const active = await getTenantBySubdomain(subdomain);
    expect(active?.status).toBe("active");

    const disabled = await updateTenantStatus(active!.id, "disabled");
    expect(disabled.status).toBe("disabled");

    const reactivated = await updateTenantStatus(active!.id, "active");
    expect(reactivated.status).toBe("active");
    expect(reactivated.plan).toBe("medium");
  });
});
