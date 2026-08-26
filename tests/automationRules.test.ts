import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { recordActivity } from "../src/tenant/notifications/recordActivity";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let ownerId: string;
let assigneeId: string;
let projectId: string;
let statusId: string;

beforeEach(async () => {
  const subdomain = `automationrules-${Date.now()}`;
  await provisionTenant({ name: "Automation Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  const assignee = await tenantDb.user.create({ data: { email: "assignee@example.com", role: "member" } });
  ownerId = owner.id;
  assigneeId = assignee.id;

  const project = await tenantDb.project.create({ data: { name: "Project" } });
  projectId = project.id;
  const todoStatus = await tenantDb.workflowStatus.create({
    data: { projectId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  await tenantDb.workflowStatus.create({
    data: { projectId, name: "Done", category: "done", position: 1 },
  });
  statusId = todoStatus.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("automation rules execution (via recordActivity)", () => {
  it("assigns a newly created task to the configured user when the task_created trigger matches", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.automationRule.create({
      data: {
        name: "Auto-assign new tasks",
        trigger: "task_created",
        createdById: ownerId,
        actions: { create: [{ type: "assign_user", targetUserId: assigneeId, position: 0 }] },
      },
    });

    const task = await tenantDb.task.create({
      data: { title: "New task", statusId, projects: { create: { projectId, isPrimary: true } } },
    });

    await recordActivity(tenantDb, {
      projectId,
      actorId: ownerId,
      type: "task_created",
      summary: "Task created",
      taskId: task.id,
    });

    const updated = await tenantDb.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(updated.assigneeId).toBe(assigneeId);
  });

  it("only fires a status-changed rule when the condition category matches", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.automationRule.create({
      data: {
        name: "Notify on done",
        trigger: "task_status_changed",
        conditionStatusCategory: "done",
        createdById: ownerId,
        actions: { create: [{ type: "notify_user", targetUserId: assigneeId, position: 0 }] },
      },
    });

    const task = await tenantDb.task.create({
      data: { title: "Task", statusId, projects: { create: { projectId, isPrimary: true } } },
    });

    await recordActivity(tenantDb, {
      projectId,
      actorId: ownerId,
      type: "task_status_changed",
      summary: "Status changed to Todo",
      taskId: task.id,
      statusCategory: "not_started",
    });
    // The general activity-notification fanout already notifies project members of any
    // status change, independent of automations — capture that baseline first.
    const baselineCount = (await tenantDb.notification.findMany({ where: { userId: assigneeId } })).length;

    await recordActivity(tenantDb, {
      projectId,
      actorId: ownerId,
      type: "task_status_changed",
      summary: "Status changed to Done",
      taskId: task.id,
      statusCategory: "done",
    });
    const afterDoneCount = (await tenantDb.notification.findMany({ where: { userId: assigneeId } })).length;
    // The automation's notify_user action adds one notification on top of the
    // fanout notification that the "Done" activity event itself also generates.
    expect(afterDoneCount).toBe(baselineCount + 2);
  });

  it("does not run a disabled rule", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.automationRule.create({
      data: {
        name: "Disabled rule",
        trigger: "task_created",
        isEnabled: false,
        createdById: ownerId,
        actions: { create: [{ type: "assign_user", targetUserId: assigneeId, position: 0 }] },
      },
    });

    const task = await tenantDb.task.create({
      data: { title: "Untouched task", statusId, projects: { create: { projectId, isPrimary: true } } },
    });

    await recordActivity(tenantDb, {
      projectId,
      actorId: ownerId,
      type: "task_created",
      summary: "Task created",
      taskId: task.id,
    });

    const updated = await tenantDb.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(updated.assigneeId).toBeNull();
  });
});
