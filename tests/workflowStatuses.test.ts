import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `wfstatus-${Date.now()}`;
  await provisionTenant({ name: "Workflow Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("workflow status deletion guard", () => {
  it("prevents deleting a status that still has tasks (via count check, mirrors the API route)", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({
      data: { name: "Guarded Project", statuses: { create: defaultWorkflowStatuses() } },
      include: { statuses: true },
    });
    const status = project.statuses[0];

    await tenantDb.task.create({
      data: { title: "Blocking task", statusId: status.id, projects: { create: { projectId: project.id } } },
    });

    const taskCount = await tenantDb.task.count({ where: { statusId: status.id } });
    expect(taskCount).toBeGreaterThan(0);
  });

  it("allows deleting a status with no tasks", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const project = await tenantDb.project.create({
      data: { name: "Deletable Status Project", statuses: { create: defaultWorkflowStatuses() } },
      include: { statuses: true },
    });
    const status = project.statuses[2];

    const taskCount = await tenantDb.task.count({ where: { statusId: status.id } });
    expect(taskCount).toBe(0);

    await tenantDb.workflowStatus.delete({ where: { id: status.id } });
    const remaining = await tenantDb.workflowStatus.findMany({ where: { projectId: project.id } });
    expect(remaining).toHaveLength(2);
  });
});
