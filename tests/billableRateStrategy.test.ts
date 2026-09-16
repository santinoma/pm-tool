import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { handleSectionEntry } from "@/app/api/tenant/time-entries/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let projectId: string;
let owner: User;
let member: User;
let budgetId: string;

function bookOneHour(sectionId: string, userId: string) {
  return handleSectionEntry(tenantDb, userId, null, {
    budgetSectionId: sectionId,
    startedAt: "2026-01-01T09:00:00.000Z",
    endedAt: "2026-01-01T10:00:00.000Z",
  });
}

beforeEach(async () => {
  const subdomain = `billablerate-${Date.now()}`;
  await provisionTenant({ name: "Billable Rate Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
  const project = await tenantDb.project.create({ data: { name: "Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Billable Rate Strategy (T313)", () => {
  it("service strategy (default) bills at the section price, unaffected by a person rate", async () => {
    const budget = await tenantDb.budget.create({ data: { title: "B", projectId, ownerId: owner.id } });
    budgetId = budget.id;
    const section = await tenantDb.budgetSection.create({
      data: {
        budgetId,
        name: "Consulting",
        quantity: 10,
        price: 100,
        trackTime: true,
        assignees: { create: [{ userId: member.id, hourlyRate: 999 }] },
      },
    });

    const response = await bookOneHour(section.id, member.id);
    expect(response.status).toBe(201);
    const entry = await response.json();
    expect(entry.entry.amount).toBe(100);
  });

  it("person strategy bills at the assignee's own rate, ignoring the section price", async () => {
    const budget = await tenantDb.budget.create({
      data: { title: "B", projectId, ownerId: owner.id, billableRateStrategy: "person" },
    });
    budgetId = budget.id;
    const section = await tenantDb.budgetSection.create({
      data: {
        budgetId,
        name: "Consulting",
        quantity: 10,
        price: 100,
        trackTime: true,
        assignees: { create: [{ userId: member.id, hourlyRate: 55 }] },
      },
    });

    const response = await bookOneHour(section.id, member.id);
    expect(response.status).toBe(201);
    const entry = await response.json();
    expect(entry.entry.amount).toBe(55);
  });

  it("person strategy falls back to the section price when the booking person has no configured rate", async () => {
    const budget = await tenantDb.budget.create({
      data: { title: "B", projectId, ownerId: owner.id, billableRateStrategy: "person" },
    });
    budgetId = budget.id;
    const section = await tenantDb.budgetSection.create({
      data: {
        budgetId,
        name: "Consulting",
        quantity: 10,
        price: 100,
        trackTime: true,
        assignees: { create: [{ userId: member.id }] },
      },
    });

    const response = await bookOneHour(section.id, member.id);
    expect(response.status).toBe(201);
    const entry = await response.json();
    expect(entry.entry.amount).toBe(100);
  });

  it("single strategy bills at the one flat budget-wide rate, ignoring section price and person rate", async () => {
    const budget = await tenantDb.budget.create({
      data: { title: "B", projectId, ownerId: owner.id, billableRateStrategy: "single", billableRate: 42 },
    });
    budgetId = budget.id;
    const section = await tenantDb.budgetSection.create({
      data: {
        budgetId,
        name: "Consulting",
        quantity: 10,
        price: 100,
        trackTime: true,
        assignees: { create: [{ userId: member.id, hourlyRate: 999 }] },
      },
    });

    const response = await bookOneHour(section.id, member.id);
    expect(response.status).toBe(201);
    const entry = await response.json();
    expect(entry.entry.amount).toBe(42);
  });

  it("no_rate strategy never bills automatically", async () => {
    const budget = await tenantDb.budget.create({
      data: { title: "B", projectId, ownerId: owner.id, billableRateStrategy: "no_rate" },
    });
    budgetId = budget.id;
    const section = await tenantDb.budgetSection.create({
      data: {
        budgetId,
        name: "Consulting",
        quantity: 10,
        price: 100,
        trackTime: true,
        assignees: { create: [{ userId: member.id, hourlyRate: 999 }] },
      },
    });

    const response = await bookOneHour(section.id, member.id);
    expect(response.status).toBe(201);
    const entry = await response.json();
    expect(entry.entry.amount).toBe(0);
  });
});
