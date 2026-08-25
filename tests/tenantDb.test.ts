import { describe, expect, it } from "vitest";
import { getTenantDbClient } from "../src/tenant/tenantDb";

describe("getTenantDbClient", () => {
  it("returns the same client instance for the same connection URL", () => {
    const url = "postgresql://pmtool:pmtool@localhost:5432/pmtool_tenant_dev";
    const first = getTenantDbClient(url);
    const second = getTenantDbClient(url);
    expect(first).toBe(second);
  });

  it("returns different client instances for different connection URLs", () => {
    const a = getTenantDbClient("postgresql://pmtool:pmtool@localhost:5432/tenant_a");
    const b = getTenantDbClient("postgresql://pmtool:pmtool@localhost:5432/tenant_b");
    expect(a).not.toBe(b);
  });
});
