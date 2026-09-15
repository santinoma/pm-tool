import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { getOrCreateTenantSettings } from "../src/tenant/timeTracking/tenantSettings";
import { validateEntryTarget } from "../src/tenant/timeTracking/duration";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let userId: string;
let taskId: string;
let projectId: string;

beforeEach(async () => {
  const subdomain = `entries-${Date.now()}`;
  await provisionTenant({ name: "Entries Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const user = await tenantDb.user.create({ data: { email: "user@example.com", role: "member" } });
  userId = user.id;
  const project = await tenantDb.project.create({
    data: { name: "Entries Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
    include: { workflow: { include: { statuses: true } } },
  });
  projectId = project.id;
  const task = await tenantDb.task.create({
    data: {
      title: "Task",
      statusId: project.workflow.statuses[0].id,
      projects: { create: { projectId: project.id } },
    },
  });
  taskId = task.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("manual time entries", () => {
  it("creates a manual entry bound to a task", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const entry = await tenantDb.timeEntry.create({
      data: { userId, taskId, durationMinutes: 90, description: "Design work" },
    });
    expect(entry.durationMinutes).toBe(90);
    expect(entry.startedAt).toBeNull();
  });

  it("rejects a project-only entry at the validation layer when the tenant setting is off (mirrors the API route)", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const settings = await getOrCreateTenantSettings(tenantDb);
    expect(settings.allowProjectLevelTimeEntries).toBe(false);

    const validation = validateEntryTarget(
      { projectId, taskId: null },
      settings.allowProjectLevelTimeEntries,
    );
    expect(validation.valid).toBe(false);
  });

  it("allows a project-only entry once the tenant setting is enabled", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const settings = await getOrCreateTenantSettings(tenantDb);
    await tenantDb.tenantSettings.update({
      where: { id: settings.id },
      data: { allowProjectLevelTimeEntries: true },
    });
    const updatedSettings = await getOrCreateTenantSettings(tenantDb);

    const validation = validateEntryTarget(
      { projectId, taskId: null },
      updatedSettings.allowProjectLevelTimeEntries,
    );
    expect(validation.valid).toBe(true);

    const entry = await tenantDb.timeEntry.create({
      data: { userId, projectId, durationMinutes: 45 },
    });
    expect(entry.projectId).toBe(projectId);
    expect(entry.taskId).toBeNull();
  });

  it("updates and deletes an entry", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const entry = await tenantDb.timeEntry.create({ data: { userId, taskId, durationMinutes: 30 } });

    const updated = await tenantDb.timeEntry.update({
      where: { id: entry.id },
      data: { durationMinutes: 60 },
    });
    expect(updated.durationMinutes).toBe(60);

    await tenantDb.timeEntry.delete({ where: { id: entry.id } });
    const found = await tenantDb.timeEntry.findUnique({ where: { id: entry.id } });
    expect(found).toBeNull();
  });
});
