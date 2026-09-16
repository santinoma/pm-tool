import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import {
  collectRequiredFieldKeys,
  findMissingRequiredFields,
  type TaskFieldState,
} from "../src/tenant/workflow/transitionValidation";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let todoStatusId: string;
let doneStatusId: string;

beforeEach(async () => {
  const subdomain = `transitionrules-${Date.now()}`;
  await provisionTenant({ name: "Transition Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const project = await tenantDb.project.create({ data: { name: "Project", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
  const todoStatus = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  const doneStatus = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "Done", category: "done", position: 1 },
  });
  todoStatusId = todoStatus.id;
  doneStatusId = doneStatus.id;

  await tenantDb.transitionRule.create({
    data: {
      projectId,
      fromStatusId: null,
      toStatusId: doneStatusId,
      requiredFieldKeys: ["assignee"],
    },
  });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("transition rule matching (mirrors the PATCH /api/tenant/tasks/[id] validation)", () => {
  it("blocks a task without an assignee from moving into a status that requires one", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const rules = await tenantDb.transitionRule.findMany({
      where: { projectId },
      select: { fromStatusId: true, toStatusId: true, requiredFieldKeys: true },
    });

    const requiredKeys = collectRequiredFieldKeys(rules, todoStatusId, doneStatusId);
    const state: TaskFieldState = {
      assignee: false,
      dueDate: false,
      estimatedHours: false,
      filledCustomFieldIds: new Set(),
    };
    const missing = findMissingRequiredFields(requiredKeys, state, {});
    expect(missing).toEqual(["Zuständige Person"]);
  });

  it("allows the transition once the assignee field is filled", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const rules = await tenantDb.transitionRule.findMany({
      where: { projectId },
      select: { fromStatusId: true, toStatusId: true, requiredFieldKeys: true },
    });

    const requiredKeys = collectRequiredFieldKeys(rules, todoStatusId, doneStatusId);
    const state: TaskFieldState = {
      assignee: true,
      dueDate: false,
      estimatedHours: false,
      filledCustomFieldIds: new Set(),
    };
    const missing = findMissingRequiredFields(requiredKeys, state, {});
    expect(missing).toEqual([]);
  });

  it("does not gate a transition into a status with no matching rule", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const rules = await tenantDb.transitionRule.findMany({
      where: { projectId },
      select: { fromStatusId: true, toStatusId: true, requiredFieldKeys: true },
    });

    const requiredKeys = collectRequiredFieldKeys(rules, doneStatusId, todoStatusId);
    expect(requiredKeys.size).toBe(0);
  });
});
