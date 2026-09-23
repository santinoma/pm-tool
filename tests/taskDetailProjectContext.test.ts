import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, Project, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { loadTaskDetail } from "@/app/(tenant)/(app)/projects/[id]/tasks/[taskId]/loadTaskDetail";

let tenant: Tenant;
let tenantDb: PrismaClient;
let owner: User;
let project: Project;

beforeEach(async () => {
  const subdomain = `taskdetailctx-${Date.now()}`;
  await provisionTenant({ name: "Task Detail Context Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner@example.com", role: "owner" } });
  project = await tenantDb.project.create({
    data: { name: "Website Relaunch", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
    include: { workflow: { include: { statuses: true } } },
  });
  vi.mocked(getTenantContext).mockResolvedValue({ tenantDb, currentUser: owner, entitledFeatures: new Set() });
});

afterEach(async () => {
  vi.clearAllMocks();
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("loadTaskDetail: project breadcrumb + time-to-complete data (T503)", () => {
  it("returns the project's name for the breadcrumb's project segment", async () => {
    const status = await tenantDb.workflowStatus.findFirstOrThrow({ where: { workflow: { projects: { some: { id: project.id } } } } });
    const task = await tenantDb.task.create({
      data: { title: "Kickoff", statusId: status.id, projects: { create: { projectId: project.id } } },
    });

    const view = await loadTaskDetail({ tenantDb, currentUser: owner, entitledFeatures: new Set() }, project.id, task.id);
    expect(view.notFound).toBe(false);
    if (view.notFound) throw new Error("unreachable");
    expect(view.projectName).toBe("Website Relaunch");
  });

  it("returns estimatedHours and timeEntries so the client can derive Time to complete", async () => {
    const status = await tenantDb.workflowStatus.findFirstOrThrow({ where: { workflow: { projects: { some: { id: project.id } } } } });
    const task = await tenantDb.task.create({
      data: { title: "Estimated task", statusId: status.id, estimatedHours: 4, projects: { create: { projectId: project.id } } },
    });
    await tenantDb.timeEntry.create({
      data: { userId: owner.id, taskId: task.id, durationMinutes: 300 },
    });

    const view = await loadTaskDetail({ tenantDb, currentUser: owner, entitledFeatures: new Set() }, project.id, task.id);
    expect(view.notFound).toBe(false);
    if (view.notFound) throw new Error("unreachable");
    expect(view.task.estimatedHours).toBe(4);
    expect(view.task.timeEntries).toHaveLength(1);
    expect(view.task.timeEntries[0].durationMinutes).toBe(300);
    // 4h estimate (240min) - 300min logged = -60min ("−1:00" once formatted client-side).
    const loggedMinutes = view.task.timeEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
    expect(Math.round(view.task.estimatedHours! * 60) - loggedMinutes).toBe(-60);
  });

  it("returns null projectName when the project record can't be found (defensive, should not throw)", async () => {
    const status = await tenantDb.workflowStatus.findFirstOrThrow({ where: { workflow: { projects: { some: { id: project.id } } } } });
    const task = await tenantDb.task.create({
      data: { title: "Orphan-ish", statusId: status.id, projects: { create: { projectId: project.id } } },
    });

    const view = await loadTaskDetail({ tenantDb, currentUser: owner, entitledFeatures: new Set() }, "does-not-exist", task.id);
    expect(view.notFound).toBe(false);
    if (view.notFound) throw new Error("unreachable");
    expect(view.projectName).toBeNull();
  });
});
