import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import { findCoveringLock, getEntryDate, isDateLocked } from "../src/tenant/timeTracking/approval";

let tenant: Tenant;
let ownerId: string;
let memberId: string;
let projectId: string;

beforeEach(async () => {
  const subdomain = `timeapproval-${Date.now()}`;
  await provisionTenant({ name: "Time Approval Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner-user@example.com", role: "owner" } });
  ownerId = owner.id;
  const member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
  memberId = member.id;
  const project = await tenantDb.project.create({ data: { name: "Project" } });
  projectId = project.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("time entry approval", () => {
  it("approving a pending entry sets status, approver and timestamp", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const entry = await tenantDb.timeEntry.create({
      data: { userId: memberId, projectId, durationMinutes: 60 },
    });
    expect(entry.approvalStatus).toBe("pending");

    const approved = await tenantDb.timeEntry.update({
      where: { id: entry.id },
      data: { approvalStatus: "approved", approvedById: ownerId, approvedAt: new Date() },
    });

    expect(approved.approvalStatus).toBe("approved");
    expect(approved.approvedById).toBe(ownerId);
    expect(approved.approvedAt).not.toBeNull();
  });

  it("rejecting a pending entry leaves it editable", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const entry = await tenantDb.timeEntry.create({
      data: { userId: memberId, projectId, durationMinutes: 45 },
    });

    const rejected = await tenantDb.timeEntry.update({
      where: { id: entry.id },
      data: { approvalStatus: "rejected", approvedById: ownerId, approvedAt: new Date() },
    });
    expect(rejected.approvalStatus).toBe("rejected");

    // no lock exists yet, so the entry is still editable
    const locks = await tenantDb.timesheetLock.findMany({ where: { userId: memberId } });
    expect(isDateLocked(getEntryDate(rejected), locks)).toBe(false);

    const edited = await tenantDb.timeEntry.update({
      where: { id: entry.id },
      data: { durationMinutes: 90 },
    });
    expect(edited.durationMinutes).toBe(90);
  });
});

describe("timesheet locks", () => {
  it("a locked period blocks the covered entry from being edited or deleted", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const now = new Date();
    const entry = await tenantDb.timeEntry.create({
      data: { userId: memberId, projectId, durationMinutes: 30, approvalStatus: "approved" },
    });

    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const lock = await tenantDb.timesheetLock.create({
      data: { userId: memberId, periodStart, periodEnd, lockedById: ownerId },
    });

    const locks = await tenantDb.timesheetLock.findMany({ where: { userId: memberId } });
    const entryDate = getEntryDate(entry);
    expect(findCoveringLock(entryDate, locks)?.id).toBe(lock.id);
    expect(isDateLocked(entryDate, locks)).toBe(true);

    // Simulates what the API route does: refuse to mutate a locked entry.
    function assertNotLocked() {
      if (isDateLocked(entryDate, locks)) {
        throw new Error("Zeiterfassungsperiode ist gesperrt.");
      }
    }
    expect(() => assertNotLocked()).toThrow("Zeiterfassungsperiode ist gesperrt.");
  });

  it("unlocking (deleting the TimesheetLock) removes the block", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const now = new Date();
    const entry = await tenantDb.timeEntry.create({
      data: { userId: memberId, projectId, durationMinutes: 30 },
    });

    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const lock = await tenantDb.timesheetLock.create({
      data: { userId: memberId, periodStart, periodEnd, lockedById: ownerId },
    });

    let locks = await tenantDb.timesheetLock.findMany({ where: { userId: memberId } });
    expect(isDateLocked(getEntryDate(entry), locks)).toBe(true);

    await tenantDb.timesheetLock.delete({ where: { id: lock.id } });

    locks = await tenantDb.timesheetLock.findMany({ where: { userId: memberId } });
    expect(isDateLocked(getEntryDate(entry), locks)).toBe(false);

    const edited = await tenantDb.timeEntry.update({
      where: { id: entry.id },
      data: { durationMinutes: 15 },
    });
    expect(edited.durationMinutes).toBe(15);
  });
});
