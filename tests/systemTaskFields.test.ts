import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { getOrCreateSystemTaskFields, PRIORITY_FIELD_KEY, TSHIRT_SIZE_FIELD_KEY } from "../src/tenant/customFields/systemTaskFields";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, Project } from "../src/generated/tenant-client/client.js";

let tenant: Tenant;
let tenantDb: PrismaClient;
let project: Project;
let statusId: string;

beforeEach(async () => {
  const subdomain = `systaskfields-${Date.now()}`;
  await provisionTenant({ name: "System Task Fields Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);
  const created = await tenantDb.project.create({
    data: { name: "Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
    include: { workflow: { include: { statuses: true } } },
  });
  project = created;
  statusId = created.workflow.statuses[0].id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("getOrCreateSystemTaskFields", () => {
  it("creates both library fields with autoAttach and the expected select options", async () => {
    const { priorityField, tShirtSizeField } = await getOrCreateSystemTaskFields(tenantDb);
    expect(priorityField.key).toBe(PRIORITY_FIELD_KEY);
    expect(priorityField.library).toBe(true);
    expect(priorityField.autoAttach).toBe(true);
    expect(priorityField.type).toBe("select");
    expect(priorityField.options).toEqual(["No Priority", "Low", "Medium", "High", "Urgent"]);

    expect(tShirtSizeField.key).toBe(TSHIRT_SIZE_FIELD_KEY);
    expect(tShirtSizeField.options).toEqual(["XS", "S", "M", "L", "XL"]);
  });

  it("is idempotent — calling twice does not create duplicate fields", async () => {
    await getOrCreateSystemTaskFields(tenantDb);
    await getOrCreateSystemTaskFields(tenantDb);
    const count = await tenantDb.customFieldDef.count({ where: { key: PRIORITY_FIELD_KEY } });
    expect(count).toBe(1);
  });

  it("attaches both fields to an existing project (not just new ones)", async () => {
    const { priorityField, tShirtSizeField } = await getOrCreateSystemTaskFields(tenantDb);
    const attachments = await tenantDb.projectCustomField.findMany({ where: { projectId: project.id } });
    const fieldIds = attachments.map((a) => a.fieldId);
    expect(fieldIds).toContain(priorityField.id);
    expect(fieldIds).toContain(tShirtSizeField.id);
  });

  it("backfills a task's legacy priority/tShirtSize enum values into CustomFieldValue rows", async () => {
    const task = await tenantDb.task.create({
      data: {
        title: "Legacy Task",
        statusId,
        projects: { create: { projectId: project.id } },
        priority: "high",
        tShirtSize: "L",
      },
    });

    const { priorityField, tShirtSizeField } = await getOrCreateSystemTaskFields(tenantDb);

    const priorityValue = await tenantDb.customFieldValue.findUnique({
      where: { fieldId_taskId: { fieldId: priorityField.id, taskId: task.id } },
    });
    expect(priorityValue?.value).toBe("High");

    const sizeValue = await tenantDb.customFieldValue.findUnique({
      where: { fieldId_taskId: { fieldId: tShirtSizeField.id, taskId: task.id } },
    });
    expect(sizeValue?.value).toBe("L");
  });

  it("does not backfill a task at the default no_priority/null state", async () => {
    const task = await tenantDb.task.create({
      data: {
        title: "Default Task",
        statusId,
        projects: { create: { projectId: project.id } },
      },
    });

    const { priorityField, tShirtSizeField } = await getOrCreateSystemTaskFields(tenantDb);

    const priorityValue = await tenantDb.customFieldValue.findUnique({
      where: { fieldId_taskId: { fieldId: priorityField.id, taskId: task.id } },
    });
    expect(priorityValue).toBeNull();

    const sizeValue = await tenantDb.customFieldValue.findUnique({
      where: { fieldId_taskId: { fieldId: tShirtSizeField.id, taskId: task.id } },
    });
    expect(sizeValue).toBeNull();
  });

  it("does not re-backfill a value the user already cleared via the custom field itself", async () => {
    const task = await tenantDb.task.create({
      data: {
        title: "Cleared Task",
        statusId,
        projects: { create: { projectId: project.id } },
        priority: "urgent",
      },
    });
    const { priorityField } = await getOrCreateSystemTaskFields(tenantDb);
    // User clears the custom field value directly (e.g. via the value-write route).
    await tenantDb.customFieldValue.delete({ where: { fieldId_taskId: { fieldId: priorityField.id, taskId: task.id } } });

    // Calling again should NOT resurrect the deleted value from the (now stale) legacy column.
    await getOrCreateSystemTaskFields(tenantDb);
    const value = await tenantDb.customFieldValue.findUnique({
      where: { fieldId_taskId: { fieldId: priorityField.id, taskId: task.id } },
    });
    expect(value).toBeNull();
  });
});
