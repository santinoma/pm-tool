import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { stopRunningTimer } from "../src/tenant/timeTracking/timer";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let userId: string;
let taskId: string;
let secondTaskId: string;

beforeEach(async () => {
  const subdomain = `timer-${Date.now()}`;
  await provisionTenant({ name: "Timer Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const user = await tenantDb.user.create({ data: { email: "user@example.com", role: "member" } });
  userId = user.id;

  const project = await tenantDb.project.create({
    data: { name: "Timer Project", statuses: { create: defaultWorkflowStatuses() } },
    include: { statuses: true },
  });
  const task = await tenantDb.task.create({
    data: {
      title: "Task 1",
      statusId: project.statuses[0].id,
      projects: { create: { projectId: project.id } },
    },
  });
  taskId = task.id;
  const secondTask = await tenantDb.task.create({
    data: {
      title: "Task 2",
      statusId: project.statuses[0].id,
      projects: { create: { projectId: project.id } },
    },
  });
  secondTaskId = secondTask.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("timer", () => {
  it("starting a timer creates a running entry (endedAt null)", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const entry = await tenantDb.timeEntry.create({
      data: { userId, taskId, startedAt: new Date() },
    });
    expect(entry.endedAt).toBeNull();
    expect(entry.durationMinutes).toBeNull();
  });

  it("stopRunningTimer stops the running entry and computes duration", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const startedAt = new Date(Date.now() - 10 * 60 * 1000);
    await tenantDb.timeEntry.create({ data: { userId, taskId, startedAt } });

    const stopped = await stopRunningTimer(tenantDb, userId);
    expect(stopped?.endedAt).not.toBeNull();
    expect(stopped?.durationMinutes).toBeGreaterThanOrEqual(9);
  });

  it("stopRunningTimer returns null when there is no running timer", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const stopped = await stopRunningTimer(tenantDb, userId);
    expect(stopped).toBeNull();
  });

  it("starting a second timer auto-stops the first one", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const firstStart = new Date(Date.now() - 5 * 60 * 1000);
    await tenantDb.timeEntry.create({ data: { userId, taskId, startedAt: firstStart } });

    // Simulates what the /timer/start route does: stop the running one, then create a new one.
    const stoppedFirst = await stopRunningTimer(tenantDb, userId);
    const second = await tenantDb.timeEntry.create({
      data: { userId, taskId: secondTaskId, startedAt: new Date() },
    });

    expect(stoppedFirst?.endedAt).not.toBeNull();
    expect(second.endedAt).toBeNull();

    const runningEntries = await tenantDb.timeEntry.findMany({
      where: { userId, endedAt: null },
    });
    expect(runningEntries).toHaveLength(1);
    expect(runningEntries[0].id).toBe(second.id);
  });
});
