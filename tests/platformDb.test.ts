import { describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";

describe("platformDb", () => {
  it("can query the platform database", async () => {
    const tenants = await platformDb.tenant.findMany();
    expect(Array.isArray(tenants)).toBe(true);
  });
});
