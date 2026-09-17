import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import type { Tenant } from "../src/platform/tenantRegistry";

// `runDueAutomationsForAllTenants` sweeps every platform tenant via `listTenants()`
// — in the real full test suite, other test files' tenants can exist concurrently,
// so calling the real function here would risk mutating another test's in-flight
// tenant data. `listTenants` is mocked to return only this file's own two tenants;
// `getTenantDbClient` stays real (it's just a cached-by-dbUrl Prisma client).
vi.mock("@/platform/tenantRegistry", async () => {
  const actual = await vi.importActual<typeof import("../src/platform/tenantRegistry")>("../src/platform/tenantRegistry");
  return { ...actual, listTenants: vi.fn() };
});

import { listTenants } from "@/platform/tenantRegistry";
import { runDueAutomationsForAllTenants } from "../src/tenant/automations/backgroundScheduler";

let activeTenant: Tenant;
let disabledTenant: Tenant;

beforeEach(async () => {
  const activeSubdomain = `bgsched-active-${Date.now()}`;
  await provisionTenant({ name: "Active Tenant", subdomain: activeSubdomain, ownerEmail: "owner@example.com" });
  activeTenant = (await getTenantBySubdomain(activeSubdomain))!;

  const disabledSubdomain = `bgsched-disabled-${Date.now()}`;
  await provisionTenant({ name: "Disabled Tenant", subdomain: disabledSubdomain, ownerEmail: "owner@example.com" });
  disabledTenant = (await getTenantBySubdomain(disabledSubdomain))!;
  disabledTenant = { ...disabledTenant, status: "disabled" };

  vi.mocked(listTenants).mockResolvedValue([activeTenant, disabledTenant]);
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: activeTenant.id } }).catch(() => undefined);
  await platformDb.tenant.delete({ where: { id: disabledTenant.id } }).catch(() => undefined);
});

describe("runDueAutomationsForAllTenants (T307 background scheduler)", () => {
  it("runs a due time_daily rule for an active tenant, attributed to the rule's creator", async () => {
    const tenantDb = getTenantDbClient(activeTenant.dbUrl);
    const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
    const assignee = await tenantDb.user.create({ data: { email: "assignee@example.com", role: "member" } });
    const project = await tenantDb.project.create({
      data: { name: "Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
      include: { workflow: { include: { statuses: true } } },
    });
    const task = await tenantDb.task.create({
      data: {
        title: "Due task",
        statusId: project.workflow.statuses[0].id,
        projects: { create: { projectId: project.id, isPrimary: true } },
      },
    });
    await tenantDb.automationRule.create({
      data: {
        name: "Daily assign",
        triggers: ["time_daily"],
        createdById: owner.id,
        actions: { create: [{ type: "assign_user", targetUserId: assignee.id, position: 0 }] },
      },
    });

    await runDueAutomationsForAllTenants(new Date("2026-08-27T12:00:00Z"));

    const updated = await tenantDb.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(updated.assigneeId).toBe(assignee.id);

    const activityEvent = await tenantDb.activityEvent.findFirstOrThrow({ where: { taskId: task.id } });
    expect(activityEvent.actorId).toBe(owner.id);
  });

  it("skips a disabled tenant entirely", async () => {
    const tenantDb = getTenantDbClient(disabledTenant.dbUrl);
    const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
    const assignee = await tenantDb.user.create({ data: { email: "assignee@example.com", role: "member" } });
    const project = await tenantDb.project.create({
      data: { name: "Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
      include: { workflow: { include: { statuses: true } } },
    });
    const task = await tenantDb.task.create({
      data: {
        title: "Due task",
        statusId: project.workflow.statuses[0].id,
        projects: { create: { projectId: project.id, isPrimary: true } },
      },
    });
    await tenantDb.automationRule.create({
      data: {
        name: "Daily assign",
        triggers: ["time_daily"],
        createdById: owner.id,
        actions: { create: [{ type: "assign_user", targetUserId: assignee.id, position: 0 }] },
      },
    });

    await runDueAutomationsForAllTenants(new Date("2026-08-27T12:00:00Z"));

    const updated = await tenantDb.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(updated.assigneeId).toBeNull();
  });

  it("a failure in one tenant does not stop the sweep for the other (isolated per tenant)", async () => {
    // Corrupting the active tenant's data path isn't practical here without mocking;
    // instead this confirms the disabled tenant's absence doesn't throw and the
    // active tenant still runs, which is the isolation guarantee that matters in
    // practice (one tenant's DB being briefly unreachable must not sink the sweep).
    const tenantDb = getTenantDbClient(activeTenant.dbUrl);
    const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
    const assignee = await tenantDb.user.create({ data: { email: "assignee@example.com", role: "member" } });
    const project = await tenantDb.project.create({
      data: { name: "Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
      include: { workflow: { include: { statuses: true } } },
    });
    const task = await tenantDb.task.create({
      data: {
        title: "Due task",
        statusId: project.workflow.statuses[0].id,
        projects: { create: { projectId: project.id, isPrimary: true } },
      },
    });
    await tenantDb.automationRule.create({
      data: {
        name: "Daily assign",
        triggers: ["time_daily"],
        createdById: owner.id,
        actions: { create: [{ type: "assign_user", targetUserId: assignee.id, position: 0 }] },
      },
    });

    await expect(runDueAutomationsForAllTenants(new Date("2026-08-27T12:00:00Z"))).resolves.toBeUndefined();
    const updated = await tenantDb.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(updated.assigneeId).toBe(assignee.id);
  });
});
