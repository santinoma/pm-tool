import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { validateCustomFieldValue } from "../src/tenant/projects/customFieldValue";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `cf-${Date.now()}`;
  await provisionTenant({ name: "CF Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("custom fields", () => {
  it("defines all four field types on a project", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({
      data: { name: "CF Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
    });

    const fields = await Promise.all([
      tenantDb.customFieldDef.create({
        data: { projectId: project.id, key: "notes", label: "Notes", type: "text", options: [] },
      }),
      tenantDb.customFieldDef.create({
        data: { projectId: project.id, key: "points", label: "Points", type: "number", options: [] },
      }),
      tenantDb.customFieldDef.create({
        data: {
          projectId: project.id,
          key: "priority",
          label: "Priority",
          type: "select",
          options: ["low", "medium", "high"],
        },
      }),
      tenantDb.customFieldDef.create({
        data: { projectId: project.id, key: "reviewDate", label: "Review Date", type: "date", options: [] },
      }),
    ]);

    expect(fields).toHaveLength(4);
  });

  it("sets and upserts a value on a task, validated against its type", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({
      data: { name: "Value Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
      include: { workflow: { include: { statuses: true } } },
    });
    const field = await tenantDb.customFieldDef.create({
      data: {
        projectId: project.id,
        key: "priority",
        label: "Priority",
        type: "select",
        options: ["low", "medium", "high"],
      },
    });
    const task = await tenantDb.task.create({
      data: {
        title: "Task with CF",
        statusId: project.workflow.statuses[0].id,
        projects: { create: { projectId: project.id } },
      },
    });

    const validation = validateCustomFieldValue("select", "medium", field.options);
    expect(validation.valid).toBe(true);

    const value = await tenantDb.customFieldValue.upsert({
      where: { fieldId_taskId: { fieldId: field.id, taskId: task.id } },
      create: { fieldId: field.id, taskId: task.id, value: "medium" },
      update: { value: "medium" },
    });
    expect(value.value).toBe("medium");

    const updated = await tenantDb.customFieldValue.upsert({
      where: { fieldId_taskId: { fieldId: field.id, taskId: task.id } },
      create: { fieldId: field.id, taskId: task.id, value: "high" },
      update: { value: "high" },
    });
    expect(updated.value).toBe("high");

    const allValues = await tenantDb.customFieldValue.findMany({ where: { taskId: task.id } });
    expect(allValues).toHaveLength(1);
  });

  it("rejects an invalid select value before it would be persisted", () => {
    const validation = validateCustomFieldValue("select", "urgent", ["low", "medium", "high"]);
    expect(validation.valid).toBe(false);
  });
});
