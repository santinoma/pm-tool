import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { executeRuleActions, runAutomations } from "../src/tenant/automations/runAutomations";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let ownerId: string;
let projectId: string;
let todoStatusId: string;

beforeEach(async () => {
  const subdomain = `automationerr-${Date.now()}`;
  await provisionTenant({ name: "Automation Error Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  ownerId = owner.id;

  const project = await tenantDb.project.create({ data: { name: "Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
  const todo = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  todoStatusId = todo.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("automation error isolation", () => {
  it("a failing action does not stop subsequent actions in the same rule from running", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const task = await tenantDb.task.create({
      data: { title: "Task", statusId: todoStatusId, projects: { create: { projectId, isPrimary: true } } },
    });
    const activityEvent = await tenantDb.activityEvent.create({
      data: { projectId, actorId: ownerId, type: "task_updated", summary: "test" },
    });

    // assign_user targets a nonexistent user id, which violates the FK
    // constraint on Task.assigneeId and would throw.
    await expect(
      executeRuleActions(
        tenantDb,
        [
          { type: "assign_user", targetUserId: "does-not-exist", targetStatusId: null, commentBody: null },
          { type: "add_comment", targetUserId: null, targetStatusId: null, commentBody: "still runs" },
        ],
        task.id,
        activityEvent.id,
        ownerId,
      ),
    ).resolves.toBeUndefined();

    const comments = await tenantDb.comment.findMany({ where: { taskId: task.id } });
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe("still runs");

    const unchangedTask = await tenantDb.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(unchangedTask.assigneeId).toBeNull();
  });

  it("a failing rule does not stop other matching rules from running for the same event", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const task = await tenantDb.task.create({
      data: { title: "Task", statusId: todoStatusId, projects: { create: { projectId, isPrimary: true } } },
    });

    await tenantDb.automationRule.create({
      data: {
        name: "Broken rule",
        triggers: ["task_created"],
        createdById: ownerId,
        actions: { create: [{ type: "assign_user", targetUserId: ownerId, position: 0 }] },
      },
    });
    await tenantDb.automationRule.create({
      data: {
        name: "Working rule",
        triggers: ["task_created"],
        createdById: ownerId,
        actions: { create: [{ type: "add_comment", commentBody: "from the working rule", position: 0 }] },
      },
    });

    const activityEvent = await tenantDb.activityEvent.create({
      data: { projectId, actorId: ownerId, type: "task_created", summary: "test" },
    });

    // Force the first matching rule's action to throw — simulates an
    // unexpected failure (e.g. a DB constraint issue) that isn't otherwise
    // reachable through valid input, since the schema's own FK constraints
    // reject genuinely invalid ids before an action ever runs.
    const updateSpy = vi.spyOn(tenantDb.task, "update").mockRejectedValueOnce(new Error("simulated failure"));

    await expect(
      runAutomations(tenantDb, { type: "task_created", taskId: task.id, projectId }, activityEvent.id, ownerId),
    ).resolves.toBeUndefined();

    updateSpy.mockRestore();

    const comments = await tenantDb.comment.findMany({ where: { taskId: task.id } });
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe("from the working rule");
  });
});
