import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `cfext-${Date.now()}`;
  await provisionTenant({ name: "CF Ext Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("custom fields — entity scoping and new types", () => {
  it("defines a budget-scoped custom field, separate from task-scoped ones", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({ data: { name: "Alpha", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } } });

    const taskField = await tenantDb.customFieldDef.create({
      data: { projectId: project.id, entityType: "task", key: "severity", label: "Severity", type: "select", options: ["low", "high"] },
    });
    const budgetField = await tenantDb.customFieldDef.create({
      data: { projectId: project.id, entityType: "budget", key: "region", label: "Region", type: "multi_select", options: ["EU", "US", "APAC"] },
    });

    const taskScoped = await tenantDb.customFieldDef.findMany({ where: { projectId: project.id, entityType: "task" } });
    const budgetScoped = await tenantDb.customFieldDef.findMany({ where: { projectId: project.id, entityType: "budget" } });

    expect(taskScoped.map((f) => f.id)).toEqual([taskField.id]);
    expect(budgetScoped.map((f) => f.id)).toEqual([budgetField.id]);
  });

  it("sets a multi_select value on a budget via BudgetCustomFieldValue", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({ data: { name: "Alpha", workflow: { create: { name: "Test Workflow" } } } });
    const owner = await tenantDb.user.create({ data: { email: "own@example.com", role: "owner" } });
    const budget = await tenantDb.budget.create({ data: { projectId: project.id, title: "Q3", ownerId: owner.id } });
    const field = await tenantDb.customFieldDef.create({
      data: { projectId: project.id, entityType: "budget", key: "region", label: "Region", type: "multi_select", options: ["EU", "US"] },
    });

    const value = await tenantDb.budgetCustomFieldValue.upsert({
      where: { fieldId_budgetId: { fieldId: field.id, budgetId: budget.id } },
      create: { fieldId: field.id, budgetId: budget.id, value: JSON.stringify(["EU", "US"]) },
      update: { value: JSON.stringify(["EU", "US"]) },
    });

    expect(JSON.parse(value.value)).toEqual(["EU", "US"]);
  });

  it("sets a person-type value on a task", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({ data: { name: "Alpha", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } }, include: { workflow: { include: { statuses: true } } } });
    const reviewer = await tenantDb.user.create({ data: { email: "reviewer@example.com", role: "member" } });
    const field = await tenantDb.customFieldDef.create({
      data: { projectId: project.id, entityType: "task", key: "reviewer", label: "Reviewer", type: "person", options: [] },
    });
    const task = await tenantDb.task.create({
      data: { title: "T1", statusId: project.workflow.statuses[0].id, projects: { create: { projectId: project.id } } },
    });

    const value = await tenantDb.customFieldValue.upsert({
      where: { fieldId_taskId: { fieldId: field.id, taskId: task.id } },
      create: { fieldId: field.id, taskId: task.id, value: reviewer.id },
      update: { value: reviewer.id },
    });

    expect(value.value).toBe(reviewer.id);
  });
});

describe("budgets — service extension fields", () => {
  it("creates a budget with start/end date, color, and a service with billing/tracking/pricing fields", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({ data: { name: "Alpha", workflow: { create: { name: "Test Workflow" } } } });
    const owner = await tenantDb.user.create({ data: { email: "own2@example.com", role: "owner" } });
    const serviceType = await tenantDb.serviceType.create({ data: { name: "Programming" } });

    const budget = await tenantDb.budget.create({
      data: {
        projectId: project.id,
        title: "Q3",
        ownerId: owner.id,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-09-30"),
        color: "#12B76A",
      },
    });
    expect(budget.startDate).not.toBeNull();
    expect(budget.color).toBe("#12B76A");

    const section = await tenantDb.budgetSection.create({
      data: {
        budgetId: budget.id,
        name: "Backend work",
        quantity: 40,
        price: 100,
        serviceTypeId: serviceType.id,
        billingType: "time_and_materials",
        trackingUnit: "hours",
        discountPercent: 10,
        guaranteedMaxPrice: 5000,
        blockOverrun: true,
      },
    });

    expect(section.serviceTypeId).toBe(serviceType.id);
    expect(section.billingType).toBe("time_and_materials");
    expect(section.blockOverrun).toBe(true);
  });
});
