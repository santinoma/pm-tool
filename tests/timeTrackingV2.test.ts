import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { computeDurationMinutes } from "../src/tenant/timeTracking/duration";
import { computeEntryCost } from "../src/tenant/timeTracking/entryCost";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let sectionId: string;
let assignedUserId: string;
let otherUserId: string;

beforeEach(async () => {
  const subdomain = `timetrackingv2-${Date.now()}`;
  await provisionTenant({ name: "Time Tracking V2 Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  const other = await tenantDb.user.create({ data: { email: "other@example.com", role: "member" } });
  assignedUserId = owner.id;
  otherUserId = other.id;

  const project = await tenantDb.project.create({ data: { name: "Project" } });
  projectId = project.id;
  const budget = await tenantDb.budget.create({
    data: { projectId, title: "Retainer", ownerId: owner.id },
  });
  const section = await tenantDb.budgetSection.create({
    data: {
      budgetId: budget.id,
      name: "PM Steuerung",
      quantity: 40,
      price: 120,
      assignees: { create: [{ userId: assignedUserId }] },
    },
  });
  sectionId = section.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("section-linked time entries (data layer, mirrors the time-entries route logic)", () => {
  it("creating an entry against an assigned section increases budgetUsed by the correct amount", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const startedAt = new Date("2026-08-26T08:15:00.000Z");
    const endedAt = new Date("2026-08-26T08:30:00.000Z");
    const durationMinutes = computeDurationMinutes(startedAt, endedAt);
    expect(durationMinutes).toBe(15);

    const section = await tenantDb.budgetSection.findUniqueOrThrow({ where: { id: sectionId } });
    const amount = computeEntryCost(durationMinutes, section.price);
    expect(amount).toBe(30);

    await tenantDb.$transaction(async (tx) => {
      await tx.timeEntry.create({
        data: {
          userId: assignedUserId,
          projectId,
          budgetSectionId: sectionId,
          startedAt,
          endedAt,
          durationMinutes,
          amount,
        },
      });
      await tx.budgetSection.update({ where: { id: sectionId }, data: { budgetUsed: { increment: amount } } });
    });

    const updated = await tenantDb.budgetSection.findUniqueOrThrow({ where: { id: sectionId } });
    expect(updated.budgetUsed).toBe(30);
  });

  it("a user not assigned to the section is not among its assignees (mirrors the 403 check)", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const section = await tenantDb.budgetSection.findUniqueOrThrow({
      where: { id: sectionId },
      include: { assignees: true },
    });
    expect(section.assignees.some((a) => a.userId === otherUserId)).toBe(false);
    expect(section.assignees.some((a) => a.userId === assignedUserId)).toBe(true);
  });
});
