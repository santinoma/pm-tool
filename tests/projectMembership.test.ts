import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import {
  hasProjectMemberAccess,
  hasAnyProjectMemberAccess,
  resolveProjectIdsForTask,
  resolveProjectIdForBudget,
  resolveProjectIdForBudgetSection,
} from "../src/tenant/projectAccess/resolveProjectMembership";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `projmembership-${Date.now()}`;
  await provisionTenant({ name: "Membership Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("hasProjectMemberAccess", () => {
  it("always grants access to owner/admin regardless of membership", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const owner = await tenantDb.user.create({ data: { email: "o@example.com", role: "owner" } });
    const project = await tenantDb.project.create({ data: { name: "Alpha", workflow: { create: { name: "Test Workflow" } } } });

    expect(await hasProjectMemberAccess(tenantDb, owner, project.id)).toBe(true);
  });

  it("denies a member without a membership row", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const member = await tenantDb.user.create({ data: { email: "m@example.com", role: "member" } });
    const project = await tenantDb.project.create({ data: { name: "Alpha", workflow: { create: { name: "Test Workflow" } } } });

    expect(await hasProjectMemberAccess(tenantDb, member, project.id)).toBe(false);
  });

  it("grants a member with a ProjectMember row", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const member = await tenantDb.user.create({ data: { email: "m2@example.com", role: "member" } });
    const project = await tenantDb.project.create({ data: { name: "Alpha", workflow: { create: { name: "Test Workflow" } } } });
    await tenantDb.projectMember.create({ data: { projectId: project.id, userId: member.id } });

    expect(await hasProjectMemberAccess(tenantDb, member, project.id)).toBe(true);
  });
});

describe("hasAnyProjectMemberAccess (cross-tagged tasks)", () => {
  it("grants access if the member belongs to any one of the linked projects", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const member = await tenantDb.user.create({ data: { email: "m3@example.com", role: "member" } });
    const projectA = await tenantDb.project.create({ data: { name: "A", workflow: { create: { name: "Test Workflow" } } } });
    const projectB = await tenantDb.project.create({ data: { name: "B", workflow: { create: { name: "Test Workflow" } } } });
    await tenantDb.projectMember.create({ data: { projectId: projectB.id, userId: member.id } });

    expect(await hasAnyProjectMemberAccess(tenantDb, member, [projectA.id, projectB.id])).toBe(true);
  });

  it("denies access if the member belongs to none of the linked projects", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const member = await tenantDb.user.create({ data: { email: "m4@example.com", role: "member" } });
    const projectA = await tenantDb.project.create({ data: { name: "A", workflow: { create: { name: "Test Workflow" } } } });
    const projectB = await tenantDb.project.create({ data: { name: "B", workflow: { create: { name: "Test Workflow" } } } });

    expect(await hasAnyProjectMemberAccess(tenantDb, member, [projectA.id, projectB.id])).toBe(false);
  });
});

describe("resource resolvers", () => {
  it("resolves a task's project ids through the TaskProject join", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({ data: { name: "Alpha", workflow: { create: { name: "Test Workflow" } } } });
    const status = await tenantDb.workflowStatus.create({
      data: { workflowId: project.workflowId, name: "Todo", category: "not_started", position: 0, isDefault: true },
    });
    const task = await tenantDb.task.create({
      data: { title: "T1", statusId: status.id, projects: { create: { projectId: project.id, isPrimary: true } } },
    });

    expect(await resolveProjectIdsForTask(tenantDb, task.id)).toEqual([project.id]);
  });

  it("resolves a budget's project id", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({ data: { name: "Alpha", workflow: { create: { name: "Test Workflow" } } } });
    const owner = await tenantDb.user.create({ data: { email: "own@example.com", role: "owner" } });
    const budget = await tenantDb.budget.create({ data: { projectId: project.id, title: "Q3", ownerId: owner.id } });

    expect(await resolveProjectIdForBudget(tenantDb, budget.id)).toBe(project.id);
  });

  it("resolves a budget section's project id through the budget", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({ data: { name: "Alpha", workflow: { create: { name: "Test Workflow" } } } });
    const owner = await tenantDb.user.create({ data: { email: "own2@example.com", role: "owner" } });
    const budget = await tenantDb.budget.create({ data: { projectId: project.id, title: "Q3", ownerId: owner.id } });
    const section = await tenantDb.budgetSection.create({
      data: { budgetId: budget.id, name: "Consulting", quantity: 10, price: 100 },
    });

    expect(await resolveProjectIdForBudgetSection(tenantDb, section.id)).toBe(project.id);
  });
});
