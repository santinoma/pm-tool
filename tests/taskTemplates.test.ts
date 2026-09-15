import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { applyTaskTemplateContent, resolveTaskTemplate } from "../src/tenant/tasks/taskTemplates";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let statusId: string;
let otherStatusId: string;
let userId: string;
let customFieldId: string;

beforeEach(async () => {
  const subdomain = `tasktemplates-${Date.now()}`;
  await provisionTenant({ name: "Task Templates Kunde", subdomain, ownerEmail: "owner@example.com" });
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
  const otherStatus = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "In Progress", category: "started", position: 1, isDefault: false },
  });
  otherStatusId = otherStatus.id;
  const customField = await tenantDb.customFieldDef.create({
    data: { projectId, entityType: "task", key: "priority", label: "Priority", type: "text", options: [] },
  });
  customFieldId = customField.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("task templates", () => {
  it("creates a template task from an existing task and resolves it for the correct project", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const templateTask = await tenantDb.task.create({
      data: {
        title: "Onboarding checklist",
        statusId,
        isTemplate: true,
        assigneeId: userId,
        projects: { create: { projectId, isPrimary: true } },
      },
    });

    const otherProject = await tenantDb.project.create({ data: { name: "Other project", workflow: { create: { name: "Test Workflow" } } } });

    const resolved = await resolveTaskTemplate(tenantDb, templateTask.id, projectId);
    expect(resolved?.id).toBe(templateTask.id);

    const mismatched = await resolveTaskTemplate(tenantDb, templateTask.id, otherProject.id);
    expect(mismatched).toBeNull();

    const nonTemplate = await tenantDb.task.create({
      data: { title: "Regular task", statusId, projects: { create: { projectId, isPrimary: true } } },
    });
    const notTemplate = await resolveTaskTemplate(tenantDb, nonTemplate.id, projectId);
    expect(notTemplate).toBeNull();
  });

  it("copies custom field values, subtasks and todos onto a new task, without status/assignee", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    const templateTask = await tenantDb.task.create({
      data: {
        title: "Onboarding checklist",
        description: "Standard onboarding flow",
        statusId: otherStatusId,
        isTemplate: true,
        assigneeId: userId,
        projects: { create: { projectId, isPrimary: true } },
      },
    });

    await tenantDb.customFieldValue.create({
      data: { fieldId: customFieldId, taskId: templateTask.id, value: "High" },
    });

    await tenantDb.task.create({
      data: {
        title: "Send welcome email",
        statusId: otherStatusId,
        parentTaskId: templateTask.id,
        projects: { create: { projectId, isPrimary: true } },
      },
    });

    await tenantDb.todo.create({
      data: { taskId: templateTask.id, title: "Collect signed contract", assigneeId: userId },
    });

    // Simulate what the POST /api/tenant/tasks route does: create the new task with its
    // OWN defaults (default status, no assignee) and then copy template content onto it.
    const newTask = await tenantDb.task.create({
      data: {
        title: templateTask.title,
        description: templateTask.description,
        statusId, // the project's default status, NOT the template's status
        assigneeId: null, // instance-specific, not copied from template
        projects: { create: { projectId, isPrimary: true } },
      },
    });

    await applyTaskTemplateContent(tenantDb, {
      templateTaskId: templateTask.id,
      newTaskId: newTask.id,
      projectId,
      defaultStatusId: statusId,
    });

    // Title/description copied
    expect(newTask.title).toBe("Onboarding checklist");
    expect(newTask.description).toBe("Standard onboarding flow");

    // Status/assignee are the NEW task's own defaults, not the template's
    expect(newTask.statusId).toBe(statusId);
    expect(newTask.statusId).not.toBe(templateTask.statusId);
    expect(newTask.assigneeId).toBeNull();

    // Custom field values copied
    const copiedValues = await tenantDb.customFieldValue.findMany({ where: { taskId: newTask.id } });
    expect(copiedValues).toHaveLength(1);
    expect(copiedValues[0].fieldId).toBe(customFieldId);
    expect(copiedValues[0].value).toBe("High");

    // Subtasks copied
    const copiedSubtasks = await tenantDb.task.findMany({ where: { parentTaskId: newTask.id } });
    expect(copiedSubtasks).toHaveLength(1);
    expect(copiedSubtasks[0].title).toBe("Send welcome email");
    expect(copiedSubtasks[0].statusId).toBe(statusId);

    // Todos copied, unassigned and not done
    const copiedTodos = await tenantDb.todo.findMany({ where: { taskId: newTask.id } });
    expect(copiedTodos).toHaveLength(1);
    expect(copiedTodos[0].title).toBe("Collect signed contract");
    expect(copiedTodos[0].isDone).toBe(false);
    expect(copiedTodos[0].assigneeId).toBeNull();

    // Original template task's todo keeps its own assignee
    const originalTodos = await tenantDb.todo.findMany({ where: { taskId: templateTask.id } });
    expect(originalTodos[0].assigneeId).toBe(userId);

    // The template task itself is untouched and still marked as a template
    const stillTemplate = await tenantDb.task.findUnique({ where: { id: templateTask.id } });
    expect(stillTemplate?.isTemplate).toBe(true);

    // The new task is NOT a template unless explicitly requested
    expect(newTask.isTemplate).toBe(false);
  });
});
