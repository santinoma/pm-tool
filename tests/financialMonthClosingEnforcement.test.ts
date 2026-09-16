import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { handleSectionEntry } from "@/app/api/tenant/time-entries/route";
import { PATCH as patchTimeEntry, DELETE as deleteTimeEntry } from "@/app/api/tenant/time-entries/[id]/route";
import { POST as createExpense } from "@/app/api/tenant/expenses/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let projectId: string;
let owner: User;
let member: User;
let sectionId: string;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

function expenseRequest(body: Record<string, unknown>) {
  return new Request("http://tenant.local/api/tenant/expenses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  const subdomain = `monthclosing-${Date.now()}`;
  await provisionTenant({ name: "Month Closing Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
  const project = await tenantDb.project.create({ data: { name: "Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
  await tenantDb.projectMember.create({ data: { projectId, userId: member.id } });

  const budget = await tenantDb.budget.create({ data: { title: "Budget", projectId, ownerId: owner.id } });
  const section = await tenantDb.budgetSection.create({
    data: { budgetId: budget.id, name: "Consulting", quantity: 10, price: 100, trackTime: true },
  });
  sectionId = section.id;
  await tenantDb.budgetSectionAssignee.create({ data: { sectionId, userId: member.id } });
});

afterEach(async () => {
  vi.clearAllMocks();
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Financial Month Closing enforcement (T312)", () => {
  it("blocks a new time entry booked into a month with an explicit lock override", async () => {
    await tenantDb.financialPeriodLock.create({
      data: { periodKey: "2026-08", locked: true, lockedById: owner.id },
    });

    const response = await handleSectionEntry(tenantDb, member.id, null, {
      budgetSectionId: sectionId,
      startedAt: "2026-08-15T09:00:00.000Z",
      endedAt: "2026-08-15T10:00:00.000Z",
    });
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/Financial month is closed/);
  });

  it("allows booking once the month is explicitly unlocked again", async () => {
    await tenantDb.financialPeriodLock.create({
      data: { periodKey: "2026-08", locked: true, lockedById: owner.id },
    });
    await tenantDb.financialPeriodLock.update({ where: { periodKey: "2026-08" }, data: { locked: false } });

    const response = await handleSectionEntry(tenantDb, member.id, null, {
      budgetSectionId: sectionId,
      startedAt: "2026-08-15T09:00:00.000Z",
      endedAt: "2026-08-15T10:00:00.000Z",
    });
    expect(response.status).toBe(201);
  });

  it("blocks creating an expense dated into a locked month", async () => {
    setCurrentUser(member);
    await tenantDb.financialPeriodLock.create({
      data: { periodKey: "2026-08", locked: true, lockedById: owner.id },
    });

    const response = await createExpense(
      expenseRequest({ projectId, description: "Taxi", amount: 42, incurredAt: "2026-08-15T00:00:00.000Z" }),
    );
    expect(response.status).toBe(409);
  });

  it("allows creating an expense dated into an open month", async () => {
    setCurrentUser(member);
    await tenantDb.financialPeriodLock.create({
      data: { periodKey: "2026-08", locked: true, lockedById: owner.id },
    });

    const response = await createExpense(
      expenseRequest({ projectId, description: "Taxi", amount: 42, incurredAt: "2026-09-15T00:00:00.000Z" }),
    );
    expect(response.status).toBe(201);
  });

  it("blocks editing and deleting an existing time entry once its month is locked", async () => {
    setCurrentUser(member);
    const created = await handleSectionEntry(tenantDb, member.id, null, {
      budgetSectionId: sectionId,
      startedAt: "2026-08-15T09:00:00.000Z",
      endedAt: "2026-08-15T10:00:00.000Z",
    });
    expect(created.status).toBe(201);
    const { entry } = await created.json();

    await tenantDb.financialPeriodLock.create({
      data: { periodKey: "2026-08", locked: true, lockedById: owner.id },
    });

    const patchResponse = await patchTimeEntry(
      new Request("http://tenant.local/api/tenant/time-entries/x", {
        method: "PATCH",
        body: JSON.stringify({ description: "changed" }),
      }),
      { params: Promise.resolve({ id: entry.id }) },
    );
    expect(patchResponse.status).toBe(409);

    const deleteResponse = await deleteTimeEntry(new Request("http://tenant.local/api/tenant/time-entries/x", { method: "DELETE" }), {
      params: Promise.resolve({ id: entry.id }),
    });
    expect(deleteResponse.status).toBe(409);
  });
});
