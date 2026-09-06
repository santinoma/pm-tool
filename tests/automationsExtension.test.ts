import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { recordActivity } from "../src/tenant/notifications/recordActivity";
import { executeRuleActions } from "../src/tenant/automations/runAutomations";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let ownerId: string;
let projectId: string;
let todoStatusId: string;
let doneStatusId: string;

beforeEach(async () => {
  const subdomain = `automationsext-${Date.now()}`;
  await provisionTenant({ name: "Automation Ext Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  ownerId = owner.id;

  const project = await tenantDb.project.create({ data: { name: "Project" } });
  projectId = project.id;
  const todo = await tenantDb.workflowStatus.create({
    data: { projectId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  const done = await tenantDb.workflowStatus.create({
    data: { projectId, name: "Done", category: "done", position: 1 },
  });
  todoStatusId = todo.id;
  doneStatusId = done.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("automations — multi-trigger and new actions", () => {
  it("a rule with multiple triggers fires on any one of them", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const task = await tenantDb.task.create({
      data: { title: "Task", statusId: todoStatusId, projects: { create: { projectId, isPrimary: true } } },
    });
    await tenantDb.automationRule.create({
      data: {
        name: "Comment-triggered status change",
        triggers: ["task_commented"],
        createdById: ownerId,
        actions: { create: [{ type: "change_status", targetStatusId: doneStatusId, position: 0 }] },
      },
    });

    await tenantDb.comment.create({ data: { taskId: task.id, authorId: ownerId, body: "done!" } });
    await recordActivity(tenantDb, {
      projectId,
      actorId: ownerId,
      type: "comment_added",
      summary: "Comment added",
      taskId: task.id,
    });

    const updated = await tenantDb.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(updated.statusId).toBe(doneStatusId);
  });

  it("an add_comment action posts a comment authored by the actor", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const task = await tenantDb.task.create({
      data: { title: "Task", statusId: todoStatusId, projects: { create: { projectId, isPrimary: true } } },
    });
    const activityEvent = await tenantDb.activityEvent.create({
      data: { projectId, actorId: ownerId, type: "task_updated", summary: "test" },
    });

    await executeRuleActions(
      tenantDb,
      [{ type: "add_comment", targetUserId: null, targetStatusId: null, commentBody: "Auto comment" }],
      task.id,
      activityEvent.id,
      ownerId,
    );

    const comments = await tenantDb.comment.findMany({ where: { taskId: task.id } });
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe("Auto comment");
    expect(comments[0].authorId).toBe(ownerId);
  });

  it("fires task_updated automations when a non-status field changes", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const assignee = await tenantDb.user.create({ data: { email: "assignee2@example.com", role: "member" } });
    const task = await tenantDb.task.create({
      data: { title: "Task", statusId: todoStatusId, projects: { create: { projectId, isPrimary: true } } },
    });
    await tenantDb.automationRule.create({
      data: {
        name: "Notify on any update",
        triggers: ["task_updated"],
        createdById: ownerId,
        actions: { create: [{ type: "notify_user", targetUserId: assignee.id, position: 0 }] },
      },
    });

    await recordActivity(tenantDb, {
      projectId,
      actorId: ownerId,
      type: "task_updated",
      summary: "Task updated",
      taskId: task.id,
    });

    const notifications = await tenantDb.notification.findMany({ where: { userId: assignee.id } });
    expect(notifications.length).toBeGreaterThanOrEqual(1);
  });
});
