import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { PATCH as PATCH_COST_RATE } from "@/app/api/tenant/users/[id]/cost-rate/route";
import { POST as POST_INVOICE } from "@/app/api/tenant/budgets/[id]/invoices/route";

let tenant: Tenant;
let tenantDb: PrismaClient;

function setCurrentUser(user: User, entitledFeatures: Set<string> = new Set(["custom_roles"])) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: entitledFeatures as never,
  });
}

beforeEach(async () => {
  const subdomain = `invcost-${Date.now()}`;
  await provisionTenant({ name: "Invoicing Cost Rate Kunde", subdomain, ownerEmail: "owner@example.com", plan: "enterprise" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("PATCH /api/tenant/users/[id]/cost-rate — cost_rates_manage (T302)", () => {
  it("rejects a member who has invoicing_manage but not cost_rates_manage", async () => {
    const invoicingRole = await tenantDb.customRole.create({ data: { name: "Billing Clerk", permissions: ["invoicing_manage"] } });
    const clerk = await tenantDb.user.create({ data: { email: "clerk@example.com", role: "member", customRoleId: invoicingRole.id } });
    const target = await tenantDb.user.create({ data: { email: "target@example.com", role: "member" } });
    setCurrentUser(clerk);

    const response = await PATCH_COST_RATE(
      new Request(`http://tenant.local/api/tenant/users/${target.id}/cost-rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalCostRate: 50 }),
      }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(response.status).toBe(403);
  });

  it("allows a member who has cost_rates_manage to set a cost rate", async () => {
    const profitabilityRole = await tenantDb.customRole.create({
      data: { name: "Profitability Manager", permissions: ["cost_rates_manage"] },
    });
    const manager = await tenantDb.user.create({
      data: { email: "profit@example.com", role: "member", customRoleId: profitabilityRole.id },
    });
    const target = await tenantDb.user.create({ data: { email: "target2@example.com", role: "member" } });
    setCurrentUser(manager);

    const response = await PATCH_COST_RATE(
      new Request(`http://tenant.local/api/tenant/users/${target.id}/cost-rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalCostRate: 75 }),
      }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(response.status).toBe(200);
    const updated = await tenantDb.user.findUnique({ where: { id: target.id } });
    expect(updated?.internalCostRate).toBe(75);
  });
});

describe("POST /api/tenant/budgets/[id]/invoices — invoicing_manage (T301)", () => {
  it("rejects a member who has cost_rates_manage but not invoicing_manage", async () => {
    const profitabilityRole = await tenantDb.customRole.create({
      data: { name: "Profitability Manager", permissions: ["cost_rates_manage"] },
    });
    const manager = await tenantDb.user.create({
      data: { email: "profit2@example.com", role: "member", customRoleId: profitabilityRole.id },
    });
    const project = await tenantDb.project.create({
      data: { name: "Invoicing Project", workflow: { create: { name: "Test Workflow" } } },
    });
    const budget = await tenantDb.budget.create({ data: { title: "Budget", projectId: project.id, ownerId: manager.id } });
    await tenantDb.projectMember.create({ data: { projectId: project.id, userId: manager.id } });
    setCurrentUser(manager);

    const response = await POST_INVOICE(
      new Request(`http://tenant.local/api/tenant/budgets/${budget.id}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart: "2026-01-01", periodEnd: "2026-01-31" }),
      }),
      { params: Promise.resolve({ id: budget.id }) },
    );
    expect(response.status).toBe(403);
  });

  it("allows a member who has invoicing_manage to create an invoice", async () => {
    const invoicingRole = await tenantDb.customRole.create({ data: { name: "Billing Clerk", permissions: ["invoicing_manage"] } });
    const clerk = await tenantDb.user.create({ data: { email: "clerk2@example.com", role: "member", customRoleId: invoicingRole.id } });
    const project = await tenantDb.project.create({
      data: { name: "Invoicing Project 2", workflow: { create: { name: "Test Workflow" } } },
    });
    const budget = await tenantDb.budget.create({ data: { title: "Budget", projectId: project.id, ownerId: clerk.id } });
    await tenantDb.projectMember.create({ data: { projectId: project.id, userId: clerk.id } });
    setCurrentUser(clerk);

    const response = await POST_INVOICE(
      new Request(`http://tenant.local/api/tenant/budgets/${budget.id}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart: "2026-01-01", periodEnd: "2026-01-31" }),
      }),
      { params: Promise.resolve({ id: budget.id }) },
    );
    expect(response.status).not.toBe(403);
  });
});
