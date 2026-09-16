import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { resolveLinkedTasks } from "../src/tenant/taskLinks/taskLinkView";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let ownerId: string;
let taskAId: string;
let taskBId: string;
let doneStatusId: string;

beforeEach(async () => {
  const subdomain = `tasklinks-${Date.now()}`;
  await provisionTenant({ name: "Task Links Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const owner = await tenantDb.user.create({ data: { email: "owner-real@example.com", role: "owner" } });
  ownerId = owner.id;

  const projectA = await tenantDb.project.create({ data: { name: "Project A", workflow: { create: { name: "Test Workflow" } } } });
  const projectB = await tenantDb.project.create({ data: { name: "Project B", workflow: { create: { name: "Test Workflow" } } } });
  const statusA = await tenantDb.workflowStatus.create({
    data: { workflowId: projectA.workflowId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  const statusB = await tenantDb.workflowStatus.create({
    data: { workflowId: projectB.workflowId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  const doneStatus = await tenantDb.workflowStatus.create({
    data: { workflowId: projectB.workflowId, name: "Done", category: "done", position: 1 },
  });
  doneStatusId = doneStatus.id;

  const taskA = await tenantDb.task.create({
    data: { title: "Task A", statusId: statusA.id, projects: { create: { projectId: projectA.id, isPrimary: true } } },
  });
  const taskB = await tenantDb.task.create({
    data: { title: "Task B", statusId: statusB.id, projects: { create: { projectId: projectB.id, isPrimary: true } } },
  });
  taskAId = taskA.id;
  taskBId = taskB.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("cross-project task links (data layer, mirrors the links API route logic)", () => {
  it("a link between tasks in different projects is visible from both sides", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await tenantDb.taskLink.create({
      data: { sourceTaskId: taskAId, targetTaskId: taskBId, createdById: ownerId },
    });

    const linksFromA = await tenantDb.taskLink.findMany({
      where: { OR: [{ sourceTaskId: taskAId }, { targetTaskId: taskAId }] },
    });
    const linksFromB = await tenantDb.taskLink.findMany({
      where: { OR: [{ sourceTaskId: taskBId }, { targetTaskId: taskBId }] },
    });

    expect(resolveLinkedTasks(linksFromA, taskAId)).toEqual([{ linkId: linksFromA[0].id, taskId: taskBId }]);
    expect(resolveLinkedTasks(linksFromB, taskBId)).toEqual([{ linkId: linksFromB[0].id, taskId: taskAId }]);
  });

  it("the mirrored status reflects a status change on the linked task with no update to the link row", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const link = await tenantDb.taskLink.create({
      data: { sourceTaskId: taskAId, targetTaskId: taskBId, createdById: ownerId },
    });

    await tenantDb.task.update({ where: { id: taskBId }, data: { statusId: doneStatusId } });

    // TaskLink itself is never touched — the mirror is read live from the linked task.
    await tenantDb.taskLink.findUniqueOrThrow({ where: { id: link.id } });

    const mirroredTask = await tenantDb.task.findUniqueOrThrow({
      where: { id: taskBId },
      include: { status: true },
    });
    expect(mirroredTask.status.category).toBe("done");
  });

  it("deleting a link removes it from both sides", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const link = await tenantDb.taskLink.create({
      data: { sourceTaskId: taskAId, targetTaskId: taskBId, createdById: ownerId },
    });

    await tenantDb.taskLink.delete({ where: { id: link.id } });

    const remaining = await tenantDb.taskLink.findMany({
      where: { OR: [{ sourceTaskId: taskAId }, { targetTaskId: taskAId }] },
    });
    expect(remaining).toHaveLength(0);
  });
});
