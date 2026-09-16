import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { GET as listHistory, POST as addHistoryEntry } from "@/app/api/tenant/users/[id]/cost-rate-history/route";
import { DELETE as deleteHistoryEntry } from "@/app/api/tenant/cost-rate-history/[entryId]/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let owner: User;
let employee: User;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

function postRequest(body: unknown) {
  return new Request("http://tenant.local/api/tenant/cost-rate-history", { method: "POST", body: JSON.stringify(body) });
}

beforeEach(async () => {
  const subdomain = `costratehistory-${Date.now()}`;
  await provisionTenant({ name: "Cost Rate History Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  employee = await tenantDb.user.create({ data: { email: "employee@example.com", role: "member" } });
});

afterEach(async () => {
  vi.clearAllMocks();
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Cost Rate History API (T316)", () => {
  it("adding an entry effective today updates the cached internalCostRate", async () => {
    setCurrentUser(owner);
    const response = await addHistoryEntry(
      postRequest({ rateType: "monthly", amount: 6000, workHoursPerDay: 8, startDate: "2020-01-01" }),
      { params: Promise.resolve({ id: employee.id }) },
    );
    expect(response.status).toBe(201);

    const updated = await tenantDb.user.findUniqueOrThrow({ where: { id: employee.id } });
    expect(updated.internalCostRate).not.toBeNull();
    expect(updated.internalCostRate).toBeGreaterThan(0);
  });

  it("adding a future-dated entry does not change the current cached rate yet", async () => {
    setCurrentUser(owner);
    await addHistoryEntry(postRequest({ rateType: "monthly", amount: 5000, workHoursPerDay: 8, startDate: "2020-01-01" }), {
      params: Promise.resolve({ id: employee.id }),
    });
    const afterFirst = await tenantDb.user.findUniqueOrThrow({ where: { id: employee.id } });

    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 5);
    await addHistoryEntry(
      postRequest({ rateType: "monthly", amount: 9000, workHoursPerDay: 8, startDate: farFuture.toISOString() }),
      { params: Promise.resolve({ id: employee.id }) },
    );
    const afterSecond = await tenantDb.user.findUniqueOrThrow({ where: { id: employee.id } });

    expect(afterSecond.internalCostRate).toBe(afterFirst.internalCostRate);
  });

  it("a new entry closes the previously open-ended entry the day before it starts", async () => {
    setCurrentUser(owner);
    await addHistoryEntry(postRequest({ rateType: "monthly", amount: 5000, workHoursPerDay: 8, startDate: "2025-01-01" }), {
      params: Promise.resolve({ id: employee.id }),
    });
    await addHistoryEntry(postRequest({ rateType: "monthly", amount: 6000, workHoursPerDay: 8, startDate: "2026-01-01" }), {
      params: Promise.resolve({ id: employee.id }),
    });

    const listResponse = await listHistory(new Request("http://tenant.local"), { params: Promise.resolve({ id: employee.id }) });
    const { entries } = await listResponse.json();
    expect(entries).toHaveLength(2);
    const older = entries.find((e: { amount: number }) => e.amount === 5000);
    expect(new Date(older.endDate).toISOString().slice(0, 10)).toBe("2025-12-31");
  });

  it("deleting an entry recomputes the cached internalCostRate from the remaining entries", async () => {
    setCurrentUser(owner);
    const first = await addHistoryEntry(
      postRequest({ rateType: "monthly", amount: 5000, workHoursPerDay: 8, startDate: "2020-01-01" }),
      { params: Promise.resolve({ id: employee.id }) },
    );
    const { entry } = await first.json();

    const deleteResponse = await deleteHistoryEntry(new Request("http://tenant.local", { method: "DELETE" }), {
      params: Promise.resolve({ entryId: entry.id }),
    });
    expect(deleteResponse.status).toBe(200);

    const updated = await tenantDb.user.findUniqueOrThrow({ where: { id: employee.id } });
    expect(updated.internalCostRate).toBeNull();
  });
});
