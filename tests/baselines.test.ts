import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { computeBaselineDiff } from "../src/tenant/baselines/computeBaselineDiff";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `baselinecap-${Date.now()}`;
  await provisionTenant({ name: "Baseline Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Baselines (data layer, mirrors /api/tenant/projects/[id]/baselines)", () => {
  it("snapshots current tasks and later diffs against a shifted due date", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);

    const project = await tenantDb.project.create({ data: { name: "Roadmap" } });
    const status = await tenantDb.workflowStatus.create({
      data: { projectId: project.id, name: "Todo", category: "not_started", position: 0, isDefault: true },
    });
    const task = await tenantDb.task.create({
      data: {
        title: "Design phase",
        statusId: status.id,
        dueDate: new Date("2026-01-01"),
        estimatedHours: 10,
        projects: { create: { projectId: project.id, isPrimary: true } },
      },
    });

    const tasksAtSnapshot = await tenantDb.task.findMany({
      where: { projects: { some: { projectId: project.id } } },
      include: { status: true },
    });
    const baseline = await tenantDb.baseline.create({
      data: {
        projectId: project.id,
        name: "Kickoff plan",
        snapshots: {
          create: tasksAtSnapshot.map((t) => ({
            taskId: t.id,
            taskTitle: t.title,
            dueDate: t.dueDate,
            estimatedHours: t.estimatedHours,
            statusCategory: t.status.category,
          })),
        },
      },
      include: { snapshots: true },
    });
    expect(baseline.snapshots).toHaveLength(1);

    await tenantDb.task.update({ where: { id: task.id }, data: { dueDate: new Date("2026-01-15") } });

    const currentTasks = await tenantDb.task.findMany({
      where: { projects: { some: { projectId: project.id } } },
      include: { status: true },
    });
    const diff = computeBaselineDiff(
      baseline.snapshots.map((s) => ({
        taskId: s.taskId,
        taskTitle: s.taskTitle,
        dueDate: s.dueDate,
        estimatedHours: s.estimatedHours,
        statusCategory: s.statusCategory,
      })),
      currentTasks.map((t) => ({
        taskId: t.id,
        dueDate: t.dueDate,
        estimatedHours: t.estimatedHours,
        statusCategory: t.status.category,
      })),
    );

    expect(diff[0].dueDateShiftDays).toBe(14);
    expect(diff[0].removed).toBe(false);
  });
});
