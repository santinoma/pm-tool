import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let ownerId: string;

beforeEach(async () => {
  const subdomain = `budgeteditor-${Date.now()}`;
  await provisionTenant({ name: "Budget Editor Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  ownerId = owner.id;

  const project = await tenantDb.project.create({ data: { name: "Financials Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("rate card items", () => {
  it("stores reusable service templates independent of any budget", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const serviceType = await tenantDb.serviceType.create({ data: { name: "Programming" } });
    const rateCard = await tenantDb.rateCard.create({ data: { name: "Default Rate Card" } });
    const item = await tenantDb.rateCardItem.create({
      data: {
        rateCardId: rateCard.id,
        name: "Senior Developer",
        serviceTypeId: serviceType.id,
        billingType: "time_and_materials",
        trackingUnit: "hours",
        defaultPrice: 150,
      },
    });
    expect(item.defaultPrice).toBe(150);
    expect(item.serviceTypeId).toBe(serviceType.id);
  });
});

describe("budget scenarios", () => {
  it("clones a live budget's sections into a scenario without mutating the live budget", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const live = await tenantDb.budget.create({ data: { projectId, title: "Retainer 2026", ownerId } });
    await tenantDb.budgetSection.create({
      data: { budgetId: live.id, name: "Design", quantity: 10, price: 100, position: 0 },
    });

    const scenario = await tenantDb.budget.create({
      data: {
        projectId,
        title: "Retainer 2026 (Szenario)",
        ownerId,
        isScenario: true,
        scenarioOfId: live.id,
        sections: {
          create: [{ name: "Design", quantity: 20, price: 100, position: 0 }],
        },
      },
      include: { sections: true },
    });

    expect(scenario.isScenario).toBe(true);
    expect(scenario.scenarioOfId).toBe(live.id);
    expect(scenario.sections[0].quantity).toBe(20);

    const liveSections = await tenantDb.budgetSection.findMany({ where: { budgetId: live.id } });
    expect(liveSections[0].quantity).toBe(10);
  });

  it("promoting a scenario replaces the live budget's sections", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const live = await tenantDb.budget.create({ data: { projectId, title: "Retainer 2026", ownerId } });
    await tenantDb.budgetSection.create({
      data: { budgetId: live.id, name: "Design", quantity: 10, price: 100, position: 0 },
    });
    const scenario = await tenantDb.budget.create({
      data: {
        projectId,
        title: "Retainer 2026 (Szenario)",
        ownerId,
        isScenario: true,
        scenarioOfId: live.id,
        sections: { create: [{ name: "Design (angepasst)", quantity: 25, price: 100, position: 0 }] },
      },
      include: { sections: true },
    });

    // Mirrors the promote route's logic without going through HTTP.
    await tenantDb.budgetSection.deleteMany({ where: { budgetId: live.id } });
    for (const section of scenario.sections) {
      await tenantDb.budgetSection.create({
        data: { budgetId: live.id, name: section.name, quantity: section.quantity, price: section.price, position: section.position },
      });
    }
    await tenantDb.budgetSection.deleteMany({ where: { budgetId: scenario.id } });
    await tenantDb.budget.delete({ where: { id: scenario.id } });

    const promotedSections = await tenantDb.budgetSection.findMany({ where: { budgetId: live.id } });
    expect(promotedSections).toHaveLength(1);
    expect(promotedSections[0].name).toBe("Design (angepasst)");
    expect(promotedSections[0].quantity).toBe(25);

    const scenarioStillExists = await tenantDb.budget.findUnique({ where: { id: scenario.id } });
    expect(scenarioStillExists).toBeNull();
  });
});

describe("section duplicate and reorder", () => {
  it("duplicating a section copies its fields with a new position at the end", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const budget = await tenantDb.budget.create({ data: { projectId, title: "Retainer", ownerId } });
    const original = await tenantDb.budgetSection.create({
      data: { budgetId: budget.id, name: "Design", description: "UI work", quantity: 10, price: 100, position: 0, discountPercent: 5 },
    });

    const duplicate = await tenantDb.budgetSection.create({
      data: {
        budgetId: budget.id,
        name: `${original.name} (Kopie)`,
        description: original.description,
        quantity: original.quantity,
        price: original.price,
        discountPercent: original.discountPercent,
        position: 1,
      },
    });

    expect(duplicate.name).toBe("Design (Kopie)");
    expect(duplicate.discountPercent).toBe(5);
    expect(duplicate.position).toBe(1);
  });

  it("swapping two sections' positions reorders them", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const budget = await tenantDb.budget.create({ data: { projectId, title: "Retainer", ownerId } });
    const first = await tenantDb.budgetSection.create({
      data: { budgetId: budget.id, name: "First", quantity: 1, price: 1, position: 0 },
    });
    const second = await tenantDb.budgetSection.create({
      data: { budgetId: budget.id, name: "Second", quantity: 1, price: 1, position: 1 },
    });

    await tenantDb.budgetSection.update({ where: { id: first.id }, data: { position: 1 } });
    await tenantDb.budgetSection.update({ where: { id: second.id }, data: { position: 0 } });

    const ordered = await tenantDb.budgetSection.findMany({ where: { budgetId: budget.id }, orderBy: { position: "asc" } });
    expect(ordered.map((s) => s.name)).toEqual(["Second", "First"]);
  });
});

describe("track flags", () => {
  it("a section can disable time tracking independent of other tracking flags", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const budget = await tenantDb.budget.create({ data: { projectId, title: "Retainer", ownerId } });
    const section = await tenantDb.budgetSection.create({
      data: { budgetId: budget.id, name: "Design", quantity: 1, price: 1, trackTime: false, trackExpenses: true },
    });
    expect(section.trackTime).toBe(false);
    expect(section.trackExpenses).toBe(true);
    expect(section.trackBooking).toBe(false);
  });
});

describe("budget feed", () => {
  it("activity events can be scoped to a specific budget", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const budgetA = await tenantDb.budget.create({ data: { projectId, title: "Budget A", ownerId } });
    const budgetB = await tenantDb.budget.create({ data: { projectId, title: "Budget B", ownerId } });

    await tenantDb.activityEvent.create({
      data: { projectId, actorId: ownerId, type: "budget_created", summary: "Budget A angelegt", budgetId: budgetA.id },
    });
    await tenantDb.activityEvent.create({
      data: { projectId, actorId: ownerId, type: "budget_created", summary: "Budget B angelegt", budgetId: budgetB.id },
    });

    const feedForA = await tenantDb.activityEvent.findMany({ where: { budgetId: budgetA.id } });
    expect(feedForA).toHaveLength(1);
    expect(feedForA[0].summary).toBe("Budget A angelegt");
  });
});
