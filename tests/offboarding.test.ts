import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { runOffboardUser, OffboardValidationError } from "../src/app/api/tenant/users/[id]/offboard/route";
import { getOwnershipSummary } from "../src/app/api/tenant/users/[id]/ownership-summary/route";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { User } from "../src/generated/tenant-client/client.js";

let tenant: Tenant;
let owner: User;
let departing: User;
let successor: User;
let projectId: string;
let statusId: string;
let doneStatusId: string;

beforeEach(async () => {
  const subdomain = `offboard-${Date.now()}`;
  await provisionTenant({ name: "Offboarding Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  owner = await tenantDb.user.create({ data: { email: "owner@example.com", role: "owner" } });
  departing = await tenantDb.user.create({ data: { email: "departing@example.com", role: "member" } });
  successor = await tenantDb.user.create({ data: { email: "successor@example.com", role: "member" } });

  const project = await tenantDb.project.create({
    data: { name: "Project A", projectManager: { connect: { id: departing.id } }, workflow: { create: { name: "Test Workflow" } } },
  });
  projectId = project.id;
  await tenantDb.projectMember.create({ data: { projectId, userId: departing.id } });

  const todoStatus = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  statusId = todoStatus.id;
  const doneStatus = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "Done", category: "done", position: 1 },
  });
  doneStatusId = doneStatus.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("offboard user", () => {
  it("deactivates the user and reassigns owned budgets, managed projects, and open tasks to the successor", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    const budget = await tenantDb.budget.create({
      data: { projectId, title: "Retainer", ownerId: departing.id },
    });

    const openTask = await tenantDb.task.create({
      data: {
        title: "Open task",
        statusId,
        assigneeId: departing.id,
        projects: { create: { projectId, isPrimary: true } },
      },
    });
    const doneTask = await tenantDb.task.create({
      data: {
        title: "Done task",
        statusId: doneStatusId,
        assigneeId: departing.id,
        projects: { create: { projectId, isPrimary: true } },
      },
    });

    const result = await runOffboardUser(tenantDb, owner, departing.id, successor.id);

    expect(result.user.isActive).toBe(false);
    expect(result.reassignedTo).toBe(successor.id);
    expect(result.counts.budgetsReassigned).toBe(1);
    expect(result.counts.managedProjectsReassigned).toBe(1);
    expect(result.counts.openTasksReassigned).toBe(1);
    expect(result.counts.projectMembershipsRemoved).toBe(1);

    const updatedUser = await tenantDb.user.findUniqueOrThrow({ where: { id: departing.id } });
    expect(updatedUser.isActive).toBe(false);

    const updatedBudget = await tenantDb.budget.findUniqueOrThrow({ where: { id: budget.id } });
    expect(updatedBudget.ownerId).toBe(successor.id);

    const updatedProject = await tenantDb.project.findUniqueOrThrow({ where: { id: projectId } });
    expect(updatedProject.projectManagerId).toBe(successor.id);

    const updatedOpenTask = await tenantDb.task.findUniqueOrThrow({ where: { id: openTask.id } });
    expect(updatedOpenTask.assigneeId).toBe(successor.id);

    // Done tasks are historical — left untouched, still assigned to the departed user.
    const updatedDoneTask = await tenantDb.task.findUniqueOrThrow({ where: { id: doneTask.id } });
    expect(updatedDoneTask.assigneeId).toBe(departing.id);

    const memberships = await tenantDb.projectMember.findMany({ where: { userId: departing.id } });
    expect(memberships).toHaveLength(0);
  });

  it("clears/nulls nullable ownership fields and unassigns open tasks when no successor is given", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    const openTask = await tenantDb.task.create({
      data: {
        title: "Open task",
        statusId,
        assigneeId: departing.id,
        projects: { create: { projectId, isPrimary: true } },
      },
    });

    const result = await runOffboardUser(tenantDb, owner, departing.id, null);

    expect(result.user.isActive).toBe(false);
    expect(result.reassignedTo).toBeNull();

    const updatedProject = await tenantDb.project.findUniqueOrThrow({ where: { id: projectId } });
    expect(updatedProject.projectManagerId).toBeNull();

    const updatedOpenTask = await tenantDb.task.findUniqueOrThrow({ where: { id: openTask.id } });
    expect(updatedOpenTask.assigneeId).toBeNull();

    const memberships = await tenantDb.projectMember.findMany({ where: { userId: departing.id } });
    expect(memberships).toHaveLength(0);
  });

  it("reassigns owned deals to the successor, and rejects offboarding without one", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const client = await tenantDb.client.create({ data: { name: "Acme Corp" } });
    const pipeline = await tenantDb.pipeline.create({ data: { name: "Sales" } });
    const dealStatus = await tenantDb.dealStatus.create({
      data: { pipelineId: pipeline.id, name: "Open", category: "open", position: 0 },
    });
    const deal = await tenantDb.deal.create({
      data: { title: "Big Deal", companyId: client.id, statusId: dealStatus.id, ownerId: departing.id },
    });

    await expect(runOffboardUser(tenantDb, owner, departing.id, null)).rejects.toThrow(OffboardValidationError);

    const result = await runOffboardUser(tenantDb, owner, departing.id, successor.id);
    expect(result.counts.dealsReassigned).toBe(1);

    const updatedDeal = await tenantDb.deal.findUniqueOrThrow({ where: { id: deal.id } });
    expect(updatedDeal.ownerId).toBe(successor.id);
  });

  it("reassigns reviewed absence requests to the successor, or clears them without one", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const request = await tenantDb.absenceRequest.create({
      data: {
        userId: departing.id,
        type: "vacation",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-05"),
        reviewedById: departing.id,
      },
    });

    const result = await runOffboardUser(tenantDb, owner, departing.id, successor.id);
    expect(result.counts.absenceRequestsReassigned).toBe(1);

    const updated = await tenantDb.absenceRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(updated.reviewedById).toBe(successor.id);
  });

  it("rejects offboarding without a successor when the user owns a non-nullable-owner budget", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.budget.create({ data: { projectId, title: "Retainer", ownerId: departing.id } });

    await expect(runOffboardUser(tenantDb, owner, departing.id, null)).rejects.toThrow(OffboardValidationError);

    // Nothing should have been touched — the whole request is rejected up front.
    const stillActive = await tenantDb.user.findUniqueOrThrow({ where: { id: departing.id } });
    expect(stillActive.isActive).toBe(true);
  });

  it("rejects a reassignToUserId that doesn't resolve to a real, active user", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await expect(
      runOffboardUser(tenantDb, owner, departing.id, "nonexistent-user-id"),
    ).rejects.toThrow(OffboardValidationError);
  });

  it("rejects reassigning to the target's own id", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await expect(runOffboardUser(tenantDb, owner, departing.id, departing.id)).rejects.toThrow(
      OffboardValidationError,
    );
  });
});

describe("ownership summary", () => {
  it("returns accurate counts of what a user owns/is assigned before offboarding", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    await tenantDb.budget.create({ data: { projectId, title: "Retainer", ownerId: departing.id } });
    await tenantDb.task.create({
      data: {
        title: "Open task",
        statusId,
        assigneeId: departing.id,
        projects: { create: { projectId, isPrimary: true } },
      },
    });
    await tenantDb.task.create({
      data: {
        title: "Done task (should not count)",
        statusId: doneStatusId,
        assigneeId: departing.id,
        projects: { create: { projectId, isPrimary: true } },
      },
    });
    await tenantDb.automationRule.create({
      data: { name: "Rule", triggers: ["task_created"], createdById: departing.id },
    });

    const summary = await getOwnershipSummary(tenantDb, departing.id);

    expect(summary.budgets).toBe(1);
    expect(summary.managedProjects).toBe(1);
    expect(summary.openTasks).toBe(1);
    expect(summary.projectMemberships).toBe(1);
    expect(summary.automationRules).toBe(1);
    expect(summary.deals).toBe(0);
    expect(summary.reviewedAbsenceRequests).toBe(0);
  });
});
