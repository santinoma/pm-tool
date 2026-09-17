import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { PATCH } from "@/app/api/tenant/tenant-settings/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let owner: User;
let member: User;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

function patchRequest(body: unknown) {
  return PATCH(
    new Request("http://tenant.local/api/tenant/tenant-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(async () => {
  const subdomain = `tsettings-locfmt-${Date.now()}`;
  await provisionTenant({ name: "Location Format Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner@example.com", role: "owner" } });
  member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("PATCH /api/tenant/tenant-settings — Location & Format / Work Time / Fiscal Year", () => {
  it("updates Location & Format fields", async () => {
    setCurrentUser(owner);
    const response = await patchRequest({
      timeZone: "America/New_York",
      timeFormat: "h12",
      dateFormat: "mm_dd_yyyy",
      numberFormat: "period_decimal",
    });
    expect(response.status).toBe(200);
    const { settings } = await response.json();
    expect(settings.timeZone).toBe("America/New_York");
    expect(settings.timeFormat).toBe("h12");
    expect(settings.dateFormat).toBe("mm_dd_yyyy");
    expect(settings.numberFormat).toBe("period_decimal");
  });

  it("rejects an invalid dateFormat", async () => {
    setCurrentUser(owner);
    const response = await patchRequest({ dateFormat: "not-a-format" });
    expect(response.status).toBe(400);
  });

  it("updates Work Time fields", async () => {
    setCurrentUser(owner);
    const response = await patchRequest({ weekStartDay: 0, workingDays: [0, 1, 2, 3, 4], personDayHours: 7.5 });
    expect(response.status).toBe(200);
    const { settings } = await response.json();
    expect(settings.weekStartDay).toBe(0);
    expect(settings.workingDays).toEqual([0, 1, 2, 3, 4]);
    expect(settings.personDayHours).toBe(7.5);
  });

  it("rejects a weekStartDay outside 0-6", async () => {
    setCurrentUser(owner);
    const response = await patchRequest({ weekStartDay: 9 });
    expect(response.status).toBe(400);
  });

  it("rejects a non-positive personDayHours", async () => {
    setCurrentUser(owner);
    const response = await patchRequest({ personDayHours: 0 });
    expect(response.status).toBe(400);
  });

  it("updates Fiscal Year fields", async () => {
    setCurrentUser(owner);
    const response = await patchRequest({ fiscalYearEnabled: true, fiscalYearStartMonth: 4 });
    expect(response.status).toBe(200);
    const { settings } = await response.json();
    expect(settings.fiscalYearEnabled).toBe(true);
    expect(settings.fiscalYearStartMonth).toBe(4);
  });

  it("rejects a fiscalYearStartMonth outside 1-12", async () => {
    setCurrentUser(owner);
    const response = await patchRequest({ fiscalYearStartMonth: 13 });
    expect(response.status).toBe(400);
  });

  it("denies non-managers from changing Location & Format / Work Time / Fiscal Year", async () => {
    setCurrentUser(member);
    const response = await patchRequest({ timeZone: "UTC" });
    expect(response.status).toBe(403);
  });
});
