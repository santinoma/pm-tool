import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { computeCreditedHours, countBusinessDays } from "../src/tenant/absence/businessDays";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let ownerId: string;
let memberId: string;

beforeEach(async () => {
  const subdomain = `absencemgmt-${Date.now()}`;
  await provisionTenant({ name: "Absence Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  const member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member", weeklyCapacityHours: 40 } });
  ownerId = owner.id;
  memberId = member.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("absence request lifecycle (data layer, mirrors the API route logic)", () => {
  it("a member's pending request becomes approved and is stamped with the reviewer", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const created = await tenantDb.absenceRequest.create({
      data: {
        userId: memberId,
        type: "vacation",
        startDate: new Date("2026-08-24"),
        endDate: new Date("2026-08-28"),
      },
    });
    expect(created.status).toBe("pending");

    const approved = await tenantDb.absenceRequest.update({
      where: { id: created.id },
      data: { status: "approved", reviewedById: ownerId, reviewedAt: new Date() },
    });
    expect(approved.status).toBe("approved");
    expect(approved.reviewedById).toBe(ownerId);

    const businessDays = countBusinessDays(approved.startDate, approved.endDate);
    expect(businessDays).toBe(5);
    expect(computeCreditedHours(businessDays, 40)).toBe(40);
  });

  it("only pending requests show up in the approval queue", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const pending = await tenantDb.absenceRequest.create({
      data: { userId: memberId, type: "sick", startDate: new Date("2026-08-24"), endDate: new Date("2026-08-24") },
    });
    const rejected = await tenantDb.absenceRequest.create({
      data: { userId: memberId, type: "sick", startDate: new Date("2026-08-25"), endDate: new Date("2026-08-25") },
    });
    await tenantDb.absenceRequest.update({
      where: { id: rejected.id },
      data: { status: "rejected", reviewedById: ownerId, reviewedAt: new Date() },
    });

    const queue = await tenantDb.absenceRequest.findMany({ where: { status: "pending" } });
    expect(queue.map((r) => r.id)).toEqual([pending.id]);
  });
});
