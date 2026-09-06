import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { recordActivity } from "../src/tenant/notifications/recordActivity";
import { executeRuleActions, selectMatchingRules, type AutomationRuleInput } from "../src/tenant/automations/runAutomations";
import { runDueTimeAutomationRules } from "../src/tenant/automations/scheduleDueCheck";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let ownerId: string;
let projectAId: string;
let projectBId: string;
let todoStatusAId: string;
let todoStatusBId: string;

beforeEach(async () => {
  const subdomain = `automationexp-${Date.now()}`;
  await provisionTenant({ name: "Automation Expansion Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  ownerId = owner.id;

  const projectA = await tenantDb.project.create({ data: { name: "Project A" } });
  projectAId = projectA.id;
  const projectB = await tenantDb.project.create({ data: { name: "Project B" } });
  projectBId = projectB.id;

  const todoA = await tenantDb.workflowStatus.create({
    data: { projectId: projectAId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  todoStatusAId = todoA.id;
  const todoB = await tenantDb.workflowStatus.create({
    data: { projectId: projectBId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  todoStatusBId = todoB.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("selectMatchingRules — project scope", () => {
  function rule(overrides: Partial<AutomationRuleInput>): AutomationRuleInput {
    return {
      id: "rule-1",
      triggers: ["task_created"],
      conditionStatusCategory: null,
      isEnabled: true,
      actions: [],
      projectIds: [],
      ...overrides,
    };
  }

  it("a project-scoped rule only matches events whose task is in one of its projects", () => {
    const rules = [rule({ projectIds: ["proj-a"] })];
    const matchesA = selectMatchingRules(rules, { type: "task_created", taskId: "t1", projectId: "proj-a" });
    const matchesB = selectMatchingRules(rules, { type: "task_created", taskId: "t2", projectId: "proj-b" });
    expect(matchesA).toHaveLength(1);
    expect(matchesB).toHaveLength(0);
  });

  it("an empty-projectIds rule matches events from any project (legacy regression check)", () => {
    const rules = [rule({ projectIds: [] })];
    const matchesA = selectMatchingRules(rules, { type: "task_created", taskId: "t1", projectId: "proj-a" });
    const matchesB = selectMatchingRules(rules, { type: "task_created", taskId: "t2", projectId: "proj-b" });
    const matchesUnknown = selectMatchingRules(rules, { type: "task_created", taskId: "t3" });
    expect(matchesA).toHaveLength(1);
    expect(matchesB).toHaveLength(1);
    expect(matchesUnknown).toHaveLength(1);
  });

  it("a project-scoped rule does not match when the event has no resolvable project", () => {
    const rules = [rule({ projectIds: ["proj-a"] })];
    const matches = selectMatchingRules(rules, { type: "task_created", taskId: "t1" });
    expect(matches).toHaveLength(0);
  });
});

describe("recordActivity → runAutomations — project scope end to end", () => {
  it("a rule scoped to Project A does not fire for a task in Project B", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const taskInB = await tenantDb.task.create({
      data: { title: "Task B", statusId: todoStatusBId, projects: { create: { projectId: projectBId, isPrimary: true } } },
    });
    const assignee = await tenantDb.user.create({ data: { email: "assignee-scope@example.com", role: "member" } });

    await tenantDb.automationRule.create({
      data: {
        name: "Scoped to A",
        triggers: ["task_created"],
        projectIds: [projectAId],
        createdById: ownerId,
        actions: { create: [{ type: "assign_user", targetUserId: assignee.id, position: 0 }] },
      },
    });

    await recordActivity(tenantDb, {
      projectId: projectBId,
      actorId: ownerId,
      type: "task_created",
      summary: "Task created",
      taskId: taskInB.id,
    });

    const updated = await tenantDb.task.findUniqueOrThrow({ where: { id: taskInB.id } });
    expect(updated.assigneeId).toBeNull();
  });

  it("a rule with empty projectIds still fires for any project (legacy behavior preserved)", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const taskInB = await tenantDb.task.create({
      data: { title: "Task B2", statusId: todoStatusBId, projects: { create: { projectId: projectBId, isPrimary: true } } },
    });
    const assignee = await tenantDb.user.create({ data: { email: "assignee-scope2@example.com", role: "member" } });

    await tenantDb.automationRule.create({
      data: {
        name: "Unscoped",
        triggers: ["task_created"],
        createdById: ownerId,
        actions: { create: [{ type: "assign_user", targetUserId: assignee.id, position: 0 }] },
      },
    });

    await recordActivity(tenantDb, {
      projectId: projectBId,
      actorId: ownerId,
      type: "task_created",
      summary: "Task created",
      taskId: taskInB.id,
    });

    const updated = await tenantDb.task.findUniqueOrThrow({ where: { id: taskInB.id } });
    expect(updated.assigneeId).toBe(assignee.id);
  });
});

describe("executeRuleActions — new action types", () => {
  it("create_task creates a new task in the same project with the given title and assignee", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const triggerTask = await tenantDb.task.create({
      data: { title: "Trigger", statusId: todoStatusAId, projects: { create: { projectId: projectAId, isPrimary: true } } },
    });
    const assignee = await tenantDb.user.create({ data: { email: "assignee-ct@example.com", role: "member" } });
    const activityEvent = await tenantDb.activityEvent.create({
      data: { projectId: projectAId, actorId: ownerId, type: "task_updated", summary: "test" },
    });

    await executeRuleActions(
      tenantDb,
      [{ type: "create_task", targetUserId: assignee.id, targetStatusId: null, commentBody: null, newItemTitle: "Follow-up task" }],
      triggerTask.id,
      activityEvent.id,
      ownerId,
    );

    const newTasks = await tenantDb.task.findMany({
      where: { title: "Follow-up task" },
      include: { projects: true },
    });
    expect(newTasks).toHaveLength(1);
    expect(newTasks[0].assigneeId).toBe(assignee.id);
    expect(newTasks[0].parentTaskId).toBeNull();
    expect(newTasks[0].projects.some((p) => p.projectId === projectAId && p.isPrimary)).toBe(true);
  });

  it("create_subtask creates a new task with parentTaskId set to the triggering task", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const triggerTask = await tenantDb.task.create({
      data: { title: "Parent", statusId: todoStatusAId, projects: { create: { projectId: projectAId, isPrimary: true } } },
    });
    const activityEvent = await tenantDb.activityEvent.create({
      data: { projectId: projectAId, actorId: ownerId, type: "task_updated", summary: "test" },
    });

    await executeRuleActions(
      tenantDb,
      [{ type: "create_subtask", targetUserId: null, targetStatusId: null, commentBody: null, newItemTitle: "Sub work" }],
      triggerTask.id,
      activityEvent.id,
      ownerId,
    );

    const subtasks = await tenantDb.task.findMany({ where: { parentTaskId: triggerTask.id } });
    expect(subtasks).toHaveLength(1);
    expect(subtasks[0].title).toBe("Sub work");
  });

  it("create_task falls back to a default title when newItemTitle is null", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const triggerTask = await tenantDb.task.create({
      data: { title: "Trigger2", statusId: todoStatusAId, projects: { create: { projectId: projectAId, isPrimary: true } } },
    });
    const activityEvent = await tenantDb.activityEvent.create({
      data: { projectId: projectAId, actorId: ownerId, type: "task_updated", summary: "test" },
    });

    await executeRuleActions(
      tenantDb,
      [{ type: "create_task", targetUserId: null, targetStatusId: null, commentBody: null, newItemTitle: null }],
      triggerTask.id,
      activityEvent.id,
      ownerId,
    );

    const newTasks = await tenantDb.task.findMany({ where: { title: "Automatisierter Task" } });
    expect(newTasks).toHaveLength(1);
  });

  it("create_todo creates a Todo row on the triggering task", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const triggerTask = await tenantDb.task.create({
      data: { title: "Task with todo", statusId: todoStatusAId, projects: { create: { projectId: projectAId, isPrimary: true } } },
    });
    const assignee = await tenantDb.user.create({ data: { email: "assignee-todo@example.com", role: "member" } });
    const activityEvent = await tenantDb.activityEvent.create({
      data: { projectId: projectAId, actorId: ownerId, type: "task_updated", summary: "test" },
    });

    await executeRuleActions(
      tenantDb,
      [{ type: "create_todo", targetUserId: assignee.id, targetStatusId: null, commentBody: null, newItemTitle: "Checklist item" }],
      triggerTask.id,
      activityEvent.id,
      ownerId,
    );

    const todos = await tenantDb.todo.findMany({ where: { taskId: triggerTask.id } });
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe("Checklist item");
    expect(todos[0].assigneeId).toBe(assignee.id);
  });

  it("send_email is a documented no-op — no error, no side effects on the task", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const triggerTask = await tenantDb.task.create({
      data: { title: "Email task", statusId: todoStatusAId, projects: { create: { projectId: projectAId, isPrimary: true } } },
    });
    const activityEvent = await tenantDb.activityEvent.create({
      data: { projectId: projectAId, actorId: ownerId, type: "task_updated", summary: "test" },
    });

    await expect(
      executeRuleActions(
        tenantDb,
        [{ type: "send_email", targetUserId: null, targetStatusId: null, commentBody: null, newItemTitle: null }],
        triggerTask.id,
        activityEvent.id,
        ownerId,
      ),
    ).resolves.toBeUndefined();

    const unchanged = await tenantDb.task.findUniqueOrThrow({ where: { id: triggerTask.id } });
    expect(unchanged.title).toBe("Email task");
  });
});

describe("runDueTimeAutomationRules — bulk find-and-run with a cap", () => {
  it("runs a due time_daily rule's actions against every matching task, scoped to the rule's projects", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const assignee = await tenantDb.user.create({ data: { email: "assignee-bulk@example.com", role: "member" } });

    const tasksInA = await Promise.all(
      [1, 2, 3].map((n) =>
        tenantDb.task.create({
          data: { title: `A${n}`, statusId: todoStatusAId, projects: { create: { projectId: projectAId, isPrimary: true } } },
        }),
      ),
    );
    const taskInB = await tenantDb.task.create({
      data: { title: "B1", statusId: todoStatusBId, projects: { create: { projectId: projectBId, isPrimary: true } } },
    });

    await tenantDb.automationRule.create({
      data: {
        name: "Daily bulk assign",
        triggers: ["time_daily"],
        conditionStatusCategory: "not_started",
        projectIds: [projectAId],
        scheduleTime: null,
        createdById: ownerId,
        actions: { create: [{ type: "assign_user", targetUserId: assignee.id, position: 0 }] },
      },
    });

    await runDueTimeAutomationRules(tenantDb, new Date("2026-08-27T12:00:00Z"), ownerId);

    const updatedA = await Promise.all(tasksInA.map((t) => tenantDb.task.findUniqueOrThrow({ where: { id: t.id } })));
    for (const task of updatedA) {
      expect(task.assigneeId).toBe(assignee.id);
    }
    const updatedB = await tenantDb.task.findUniqueOrThrow({ where: { id: taskInB.id } });
    expect(updatedB.assigneeId).toBeNull();

    const rule = await tenantDb.automationRule.findFirstOrThrow({ where: { name: "Daily bulk assign" } });
    expect(rule.lastRunPeriodKey).toBe("2026-08-27");
  });

  it("caps the number of tasks processed per rule per run at the given bound", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const assignee = await tenantDb.user.create({ data: { email: "assignee-cap@example.com", role: "member" } });

    const tasks = await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        tenantDb.task.create({
          data: { title: `Cap${n}`, statusId: todoStatusAId, projects: { create: { projectId: projectAId, isPrimary: true } } },
        }),
      ),
    );

    await tenantDb.automationRule.create({
      data: {
        name: "Capped bulk assign",
        triggers: ["time_daily"],
        projectIds: [projectAId],
        createdById: ownerId,
        actions: { create: [{ type: "assign_user", targetUserId: assignee.id, position: 0 }] },
      },
    });

    // Small bound override to make the cap genuinely testable without creating 200+ tasks.
    await runDueTimeAutomationRules(tenantDb, new Date("2026-08-27T12:00:00Z"), ownerId, 2);

    const updated = await Promise.all(tasks.map((t) => tenantDb.task.findUniqueOrThrow({ where: { id: t.id } })));
    const assignedCount = updated.filter((t) => t.assigneeId === assignee.id).length;
    // Exactly `maxTasksPerRule` (2) of the 5 matching tasks were processed —
    // the cap held rather than running unbounded across all matches. Ties in
    // `createdAt` (tasks created concurrently in the same millisecond) make
    // which exact 2 win non-deterministic, so we assert the count, not which
    // specific tasks were picked.
    expect(assignedCount).toBe(2);
  });

  it("does not re-run a rule whose period already ran (lastRunPeriodKey matches)", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const assignee = await tenantDb.user.create({ data: { email: "assignee-norun@example.com", role: "member" } });
    const task = await tenantDb.task.create({
      data: { title: "Already ran", statusId: todoStatusAId, projects: { create: { projectId: projectAId, isPrimary: true } } },
    });

    await tenantDb.automationRule.create({
      data: {
        name: "Already ran today",
        triggers: ["time_daily"],
        lastRunPeriodKey: "2026-08-27",
        createdById: ownerId,
        actions: { create: [{ type: "assign_user", targetUserId: assignee.id, position: 0 }] },
      },
    });

    await runDueTimeAutomationRules(tenantDb, new Date("2026-08-27T12:00:00Z"), ownerId);

    const updated = await tenantDb.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(updated.assigneeId).toBeNull();
  });
});
