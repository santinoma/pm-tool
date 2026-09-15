import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { POST as deliverBudget } from "@/app/api/tenant/budgets/[id]/deliver/route";
import { POST as undeliverBudget } from "@/app/api/tenant/budgets/[id]/undeliver/route";
import { handleSectionEntry } from "@/app/api/tenant/time-entries/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let projectId: string;
let owner: User;
let member: User;
let budgetId: string;
let sectionId: string;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

function deliverRequest() {
  return new Request("http://tenant.local/api/tenant/budgets/x/deliver", { method: "POST" });
}

beforeEach(async () => {
  const subdomain = `budgetdeliver-${Date.now()}`;
  await provisionTenant({ name: "Budget Deliver Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
  const project = await tenantDb.project.create({ data: { name: "Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
  await tenantDb.projectMember.create({ data: { projectId, userId: owner.id } });
  await tenantDb.projectMember.create({ data: { projectId, userId: member.id } });

  const budget = await tenantDb.budget.create({
    data: { title: "Budget", projectId, ownerId: owner.id },
  });
  budgetId = budget.id;

  const section = await tenantDb.budgetSection.create({
    data: {
      budgetId,
      name: "Consulting",
      quantity: 10,
      price: 100, // budgetTotal = 1000
      trackTime: true,
    },
  });
  sectionId = section.id;
  await tenantDb.budgetSectionAssignee.create({ data: { sectionId, userId: member.id } });
});

afterEach(async () => {
  vi.clearAllMocks();
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("budget deliver lifecycle", () => {
  it("blocks time-entry booking against a delivered budget's section, and un-delivering re-allows it", async () => {
    setCurrentUser(owner);
    const deliverResponse = await deliverBudget(deliverRequest(), { params: Promise.resolve({ id: budgetId }) });
    expect(deliverResponse.status).toBe(200);

    const blockedBooking = await handleSectionEntry(tenantDb, member.id, null, {
      budgetSectionId: sectionId,
      startedAt: "2026-01-01T09:00:00.000Z",
      endedAt: "2026-01-01T10:00:00.000Z",
    });
    expect(blockedBooking.status).toBe(409);
    const blockedBody = await blockedBooking.json();
    expect(blockedBody.error).toMatch(/bereits geliefert/);

    const undeliverResponse = await undeliverBudget(deliverRequest(), { params: Promise.resolve({ id: budgetId }) });
    expect(undeliverResponse.status).toBe(200);

    const allowedBooking = await handleSectionEntry(tenantDb, member.id, null, {
      budgetSectionId: sectionId,
      startedAt: "2026-01-01T09:00:00.000Z",
      endedAt: "2026-01-01T10:00:00.000Z",
    });
    expect(allowedBooking.status).toBe(201);
  });

  it("returns 409 when delivering an already-delivered budget", async () => {
    setCurrentUser(owner);
    await deliverBudget(deliverRequest(), { params: Promise.resolve({ id: budgetId }) });
    const secondDeliver = await deliverBudget(deliverRequest(), { params: Promise.resolve({ id: budgetId }) });
    expect(secondDeliver.status).toBe(409);
  });
});

describe("budget-section warning thresholds", () => {
  it("sets warningNotifiedAt exactly once when usage crosses the threshold", async () => {
    await tenantDb.budgetSection.update({
      where: { id: sectionId },
      data: { warningThresholdPercent: 50 },
    });

    // budgetTotal = 1000. First booking of 6h -> amount 600 -> 60% usage, crosses 50%.
    const firstBooking = await handleSectionEntry(tenantDb, member.id, null, {
      budgetSectionId: sectionId,
      startedAt: "2026-01-01T09:00:00.000Z",
      endedAt: "2026-01-01T15:00:00.000Z",
    });
    expect(firstBooking.status).toBe(201);

    const afterFirst = await tenantDb.budgetSection.findUniqueOrThrow({ where: { id: sectionId } });
    expect(afterFirst.warningNotifiedAt).not.toBeNull();
    const notifiedAt = afterFirst.warningNotifiedAt;

    const notifications = await tenantDb.activityEvent.findMany({ where: { budgetId } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].summary).toMatch(/50% des Budgets erreicht/);

    // Second booking keeps usage above threshold — should NOT re-trigger.
    const secondBooking = await handleSectionEntry(tenantDb, member.id, null, {
      budgetSectionId: sectionId,
      startedAt: "2026-01-02T09:00:00.000Z",
      endedAt: "2026-01-02T10:00:00.000Z",
    });
    expect(secondBooking.status).toBe(201);

    const afterSecond = await tenantDb.budgetSection.findUniqueOrThrow({ where: { id: sectionId } });
    expect(afterSecond.warningNotifiedAt?.getTime()).toBe(notifiedAt?.getTime());

    const notificationsAfterSecond = await tenantDb.activityEvent.findMany({ where: { budgetId } });
    expect(notificationsAfterSecond).toHaveLength(1);
  });
});
