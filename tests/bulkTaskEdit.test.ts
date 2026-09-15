import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { runBulkPatch, runBulkDelete } from "../src/app/api/tenant/tasks/bulk/route";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { User } from "../src/generated/tenant-client/client.js";

let tenant: Tenant;
let projectId: string;
let otherProjectId: string;
let statusId: string;
let doneStatusId: string;
let member: User;

beforeEach(async () => {
  const subdomain = `bulktask-${Date.now()}`;
  await provisionTenant({ name: "Bulk Task Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });

  const project = await tenantDb.project.create({ data: { name: "Project A", workflow: { create: { name: "Test Workflow" } } } });
  projectId = project.id;
  await tenantDb.projectMember.create({ data: { projectId, userId: member.id } });

  const otherProject = await tenantDb.project.create({ data: { name: "Project B", workflow: { create: { name: "Test Workflow" } } } });
  otherProjectId = otherProject.id;
  // member is intentionally NOT a member of otherProject

  const todoStatus = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  statusId = todoStatus.id;
  const doneStatus = await tenantDb.workflowStatus.create({
    data: { workflowId: project.workflowId, name: "Done", category: "done", position: 1 },
  });
  doneStatusId = doneStatus.id;

  await tenantDb.workflowStatus.create({
    data: { workflowId: otherProject.workflowId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("bulk task edit — PATCH", () => {
  it("applies a status update to all accessible tasks", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const t1 = await tenantDb.task.create({
      data: { title: "Task 1", statusId, projects: { create: { projectId, isPrimary: true } } },
    });
    const t2 = await tenantDb.task.create({
      data: { title: "Task 2", statusId, projects: { create: { projectId, isPrimary: true } } },
    });

    const result = await runBulkPatch(tenantDb, member, {
      taskIds: [t1.id, t2.id],
      statusId: doneStatusId,
    });

    expect(result.updated.sort()).toEqual([t1.id, t2.id].sort());
    expect(result.skipped).toEqual([]);

    const updated1 = await tenantDb.task.findUnique({ where: { id: t1.id } });
    const updated2 = await tenantDb.task.findUnique({ where: { id: t2.id } });
    expect(updated1?.statusId).toBe(doneStatusId);
    expect(updated2?.statusId).toBe(doneStatusId);
  });

  it("skips a task in a project the user is not a member of, without erroring the batch", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const accessible = await tenantDb.task.create({
      data: { title: "Accessible", statusId, projects: { create: { projectId, isPrimary: true } } },
    });
    const inaccessibleStatus = await tenantDb.workflowStatus.findFirstOrThrow({
      where: { workflow: { projects: { some: { id: otherProjectId } } } },
    });
    const inaccessible = await tenantDb.task.create({
      data: {
        title: "Inaccessible",
        statusId: inaccessibleStatus.id,
        projects: { create: { projectId: otherProjectId, isPrimary: true } },
      },
    });

    const result = await runBulkPatch(tenantDb, member, {
      taskIds: [accessible.id, inaccessible.id],
      statusId: doneStatusId,
    });

    expect(result.updated).toEqual([accessible.id]);
    expect(result.skipped).toEqual([inaccessible.id]);

    const untouched = await tenantDb.task.findUnique({ where: { id: inaccessible.id } });
    expect(untouched?.statusId).toBe(inaccessibleStatus.id);
  });

  it("shifts due dates by the given number of days and skips tasks with no due date", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const withDate = await tenantDb.task.create({
      data: {
        title: "Has due date",
        statusId,
        dueDate: new Date("2026-08-10T00:00:00.000Z"),
        projects: { create: { projectId, isPrimary: true } },
      },
    });
    const withoutDate = await tenantDb.task.create({
      data: { title: "No due date", statusId, projects: { create: { projectId, isPrimary: true } } },
    });

    const result = await runBulkPatch(tenantDb, member, {
      taskIds: [withDate.id, withoutDate.id],
      dueDateShiftDays: 3,
    });

    expect(result.updated).toEqual([withDate.id]);
    expect(result.skipped).toEqual([withoutDate.id]);

    const shifted = await tenantDb.task.findUnique({ where: { id: withDate.id } });
    expect(shifted?.dueDate?.toISOString()).toBe("2026-08-13T00:00:00.000Z");
  });
});

describe("bulk task edit — DELETE", () => {
  it("deletes accessible tasks and skips ids that don't exist", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const t1 = await tenantDb.task.create({
      data: { title: "Delete me", statusId, projects: { create: { projectId, isPrimary: true } } },
    });

    const result = await runBulkDelete(tenantDb, member, {
      taskIds: [t1.id, "nonexistent-task-id"],
    });

    expect(result.deleted).toEqual([t1.id]);
    expect(result.skipped).toEqual(["nonexistent-task-id"]);

    const gone = await tenantDb.task.findUnique({ where: { id: t1.id } });
    expect(gone).toBeNull();
  });
});
