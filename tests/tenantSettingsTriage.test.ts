import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { getOrCreateTenantSettings } from "../src/tenant/timeTracking/tenantSettings";
import { resolveInitialTriageState } from "../src/tenant/projects/triageState";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let defaultStatusId: string;

beforeEach(async () => {
  const subdomain = `triage-setting-${Date.now()}`;
  await provisionTenant({ name: "Triage Setting Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const project = await tenantDb.project.create({
    data: { name: "Project", statuses: { create: defaultWorkflowStatuses() } },
    include: { statuses: true },
  });
  projectId = project.id;
  defaultStatusId = project.statuses.find((s) => s.isDefault)!.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("triageEnabled tenant setting (data layer, mirrors the tasks route logic)", () => {
  it("defaults to true — a new task lands in triage as before", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const settings = await getOrCreateTenantSettings(tenantDb);
    expect(settings.triageEnabled).toBe(true);

    const task = await tenantDb.task.create({
      data: {
        title: "Task",
        statusId: defaultStatusId,
        inTriage: resolveInitialTriageState(settings.triageEnabled),
        projects: { create: { projectId } },
      },
    });
    expect(task.inTriage).toBe(true);
  });

  it("when disabled, a new task skips triage", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const current = await getOrCreateTenantSettings(tenantDb);
    const settings = await tenantDb.tenantSettings.update({
      where: { id: current.id },
      data: { triageEnabled: false },
    });

    const task = await tenantDb.task.create({
      data: {
        title: "Task",
        statusId: defaultStatusId,
        inTriage: resolveInitialTriageState(settings.triageEnabled),
        projects: { create: { projectId } },
      },
    });
    expect(task.inTriage).toBe(false);
  });
});
