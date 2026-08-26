import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { computeSectionTotals } from "../src/tenant/budgetingV2/sectionMath";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let ownerId: string;
let memberId: string;

beforeEach(async () => {
  const subdomain = `budgetingv2-${Date.now()}`;
  await provisionTenant({ name: "Budgeting V2 Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  ownerId = owner.id;
  const member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
  memberId = member.id;

  const project = await tenantDb.project.create({ data: { name: "Financials Project" } });
  projectId = project.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("budgets and sections (data layer, mirrors the API route logic)", () => {
  it("creates a budget with a title and owner", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const budget = await tenantDb.budget.create({
      data: { projectId, title: "Retainer 2026", ownerId },
    });
    expect(budget.title).toBe("Retainer 2026");
    expect(budget.ownerId).toBe(ownerId);
  });

  it("creates a section with assigned people and computes totals correctly", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const budget = await tenantDb.budget.create({ data: { projectId, title: "Retainer 2026", ownerId } });

    const section = await tenantDb.budgetSection.create({
      data: {
        budgetId: budget.id,
        name: "Lead & PM Steuerung",
        budgetedTimeHours: 40,
        quantity: 40,
        price: 120,
        assignees: { create: [{ userId: ownerId }, { userId: memberId }] },
      },
      include: { assignees: true },
    });

    expect(section.assignees).toHaveLength(2);
    const totals = computeSectionTotals(section);
    expect(totals.budgetTotal).toBe(4800);
    expect(totals.budgetRemaining).toBe(4800);
    expect(totals.usagePercent).toBe(0);
  });

  it("a section can be edited afterward, including reassigning people", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const budget = await tenantDb.budget.create({ data: { projectId, title: "Retainer 2026", ownerId } });
    const section = await tenantDb.budgetSection.create({
      data: {
        budgetId: budget.id,
        name: "Design",
        quantity: 10,
        price: 100,
        assignees: { create: [{ userId: ownerId }] },
      },
    });

    const updated = await tenantDb.budgetSection.update({
      where: { id: section.id },
      data: { quantity: 20, price: 110, budgetUsed: 1000 },
    });
    await tenantDb.budgetSectionAssignee.deleteMany({ where: { sectionId: section.id } });
    await tenantDb.budgetSectionAssignee.create({ data: { sectionId: section.id, userId: memberId } });

    const totals = computeSectionTotals(updated);
    expect(totals.budgetTotal).toBe(2200);
    expect(totals.budgetRemaining).toBe(1200);

    const assignees = await tenantDb.budgetSectionAssignee.findMany({ where: { sectionId: section.id } });
    expect(assignees.map((a) => a.userId)).toEqual([memberId]);
  });
});
