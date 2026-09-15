import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let statusId: string;
let taskId: string;
let userId: string;

beforeEach(async () => {
  const subdomain = `taskdetail-${Date.now()}`;
  await provisionTenant({ name: "Task Detail Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const user = await tenantDb.user.create({ data: { email: "user@example.com", role: "member" } });
  userId = user.id;
  const project = await tenantDb.project.create({ data: { name: "Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
  const status = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  statusId = status.id;
  const task = await tenantDb.task.create({
    data: { title: "Parent task", statusId, projects: { create: { projectId, isPrimary: true } } },
  });
  taskId = task.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("task detail — tags", () => {
  it("finds-or-creates a tag by name and links it to the task", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const tag = await tenantDb.tag.upsert({ where: { name: "urgent" }, create: { name: "urgent" }, update: {} });
    await tenantDb.taskTag.upsert({
      where: { taskId_tagId: { taskId, tagId: tag.id } },
      create: { taskId, tagId: tag.id },
      update: {},
    });

    const links = await tenantDb.taskTag.findMany({ where: { taskId }, include: { tag: true } });
    expect(links.map((l) => l.tag.name)).toEqual(["urgent"]);

    // Same tag name reused on a second task must not create a duplicate Tag row.
    const task2 = await tenantDb.task.create({
      data: { title: "Task 2", statusId, projects: { create: { projectId, isPrimary: true } } },
    });
    const sameTag = await tenantDb.tag.upsert({ where: { name: "urgent" }, create: { name: "urgent" }, update: {} });
    expect(sameTag.id).toBe(tag.id);
    await tenantDb.taskTag.create({ data: { taskId: task2.id, tagId: sameTag.id } });

    const allTags = await tenantDb.tag.findMany();
    expect(allTags).toHaveLength(1);
  });
});

describe("task detail — subscribers", () => {
  it("subscribes and unsubscribes a user from a task", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.taskSubscriber.create({ data: { taskId, userId } });

    const subscribers = await tenantDb.taskSubscriber.findMany({ where: { taskId } });
    expect(subscribers).toHaveLength(1);

    await tenantDb.taskSubscriber.delete({ where: { taskId_userId: { taskId, userId } } });
    const afterRemoval = await tenantDb.taskSubscriber.findMany({ where: { taskId } });
    expect(afterRemoval).toHaveLength(0);
  });
});

describe("task detail — todos", () => {
  it("creates a todo with its own assignee, independent of the task's assignee", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const taskAssignee = await tenantDb.user.create({ data: { email: "taskassignee@example.com", role: "member" } });
    const todoAssignee = await tenantDb.user.create({ data: { email: "todoassignee@example.com", role: "member" } });
    await tenantDb.task.update({ where: { id: taskId }, data: { assigneeId: taskAssignee.id } });

    const todo = await tenantDb.todo.create({
      data: { taskId, title: "Prepare slides", assigneeId: todoAssignee.id, position: 0 },
    });

    expect(todo.assigneeId).toBe(todoAssignee.id);
    expect(todo.assigneeId).not.toBe(taskAssignee.id);
    expect(todo.isDone).toBe(false);

    const updated = await tenantDb.todo.update({ where: { id: todo.id }, data: { isDone: true } });
    expect(updated.isDone).toBe(true);
  });
});

describe("task detail — subtasks", () => {
  it("creates a subtask linked via parentTaskId", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const subtask = await tenantDb.task.create({
      data: {
        title: "Subtask 1",
        statusId,
        parentTaskId: taskId,
        projects: { create: { projectId, isPrimary: true } },
      },
    });

    const parentWithSubtasks = await tenantDb.task.findUnique({
      where: { id: taskId },
      include: { subtasks: true },
    });
    expect(parentWithSubtasks?.subtasks.map((s) => s.id)).toEqual([subtask.id]);
    expect(subtask.parentTaskId).toBe(taskId);
  });
});
