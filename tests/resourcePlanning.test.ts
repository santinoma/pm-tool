import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { getCurrentWeekRange, isWithinWeek } from "../src/tenant/resourcePlanning/week";
import { computeUtilization } from "../src/tenant/resourcePlanning/utilization";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let userId: string;
let projectAId: string;
let projectBId: string;

beforeEach(async () => {
  const subdomain = `resourceplanning-${Date.now()}`;
  await provisionTenant({ name: "Resource Planning Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const user = await tenantDb.user.create({
    data: { email: "worker@example.com", role: "member", weeklyCapacityHours: 40 },
  });
  userId = user.id;

  const projectA = await tenantDb.project.create({
    data: { name: "Project A", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
    include: { workflow: { include: { statuses: true } } },
  });
  projectAId = projectA.id;
  const projectB = await tenantDb.project.create({
    data: { name: "Project B", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
    include: { workflow: { include: { statuses: true } } },
  });
  projectBId = projectB.id;

  const thisWeek = getCurrentWeekRange(new Date());
  const dueThisWeek = new Date(thisWeek.start.getTime() + 24 * 60 * 60 * 1000);
  const dueNextWeek = new Date(thisWeek.end.getTime() + 24 * 60 * 60 * 1000);
  const doneStatus = projectA.workflow.statuses.find((s) => s.category === "done")!;

  await tenantDb.task.create({
    data: {
      title: "Task in Project A, due this week",
      statusId: projectA.workflow.statuses[0].id,
      assigneeId: userId,
      estimatedHours: 4,
      dueDate: dueThisWeek,
      projects: { create: { projectId: projectAId } },
    },
  });
  await tenantDb.task.create({
    data: {
      title: "Task in Project B, due this week",
      statusId: projectB.workflow.statuses[0].id,
      assigneeId: userId,
      estimatedHours: 6,
      dueDate: dueThisWeek,
      projects: { create: { projectId: projectBId } },
    },
  });
  await tenantDb.task.create({
    data: {
      title: "Task without dueDate",
      statusId: projectA.workflow.statuses[0].id,
      assigneeId: userId,
      estimatedHours: 99,
      projects: { create: { projectId: projectAId } },
    },
  });
  await tenantDb.task.create({
    data: {
      title: "Task due next week",
      statusId: projectA.workflow.statuses[0].id,
      assigneeId: userId,
      estimatedHours: 99,
      dueDate: dueNextWeek,
      projects: { create: { projectId: projectAId } },
    },
  });
  await tenantDb.task.create({
    data: {
      title: "Done task due this week",
      statusId: doneStatus.id,
      assigneeId: userId,
      estimatedHours: 99,
      dueDate: dueThisWeek,
      projects: { create: { projectId: projectAId } },
    },
  });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("resource planning aggregation (data layer, mirrors the page logic)", () => {
  it("sums estimated hours across projects for tasks due this week, excluding undated/next-week/done tasks", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const week = getCurrentWeekRange(new Date());

    const tasks = await tenantDb.task.findMany({
      where: { assigneeId: userId },
      include: { status: true },
    });
    const relevant = tasks.filter(
      (task) => task.status.category !== "done" && task.dueDate && isWithinWeek(task.dueDate, week),
    );

    expect(relevant).toHaveLength(2);

    const user = await tenantDb.user.findUniqueOrThrow({ where: { id: userId } });
    const { plannedHours } = computeUtilization(relevant, user.weeklyCapacityHours);
    expect(plannedHours).toBe(10);
  });

  it("updates weeklyCapacityHours on the user", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const updated = await tenantDb.user.update({
      where: { id: userId },
      data: { weeklyCapacityHours: 20 },
    });
    expect(updated.weeklyCapacityHours).toBe(20);
  });
});
