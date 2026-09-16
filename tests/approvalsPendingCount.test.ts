import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import type { Tenant } from "../src/platform/tenantRegistry";
import type { PrismaClient, User } from "../src/generated/tenant-client/client.js";

vi.mock("@/tenant/context", () => ({ getTenantContext: vi.fn() }));

import { getTenantContext } from "@/tenant/context";
import { GET } from "@/app/api/tenant/approvals/pending-count/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let projectId: string;
let taskId: string;
let owner: User;
let member: User;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

beforeEach(async () => {
  const subdomain = `approvals-count-${Date.now()}`;
  await provisionTenant({ name: "Approvals Count Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner@example.com", role: "owner" } });
  member = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
  const project = await tenantDb.project.create({
    data: { name: "Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
    include: { workflow: { include: { statuses: true } } },
  });
  projectId = project.id;
  const task = await tenantDb.task.create({
    data: { title: "Task", statusId: project.workflow.statuses[0].id, projects: { create: { projectId } } },
  });
  taskId = task.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("GET /api/tenant/approvals/pending-count", () => {
  it("denies non-managers", async () => {
    setCurrentUser(member);
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("sums pending time entries, expenses and absence requests", async () => {
    await tenantDb.timeEntry.createMany({
      data: [
        { userId: member.id, taskId, durationMinutes: 60, submittedAt: new Date(), approvalStatus: "pending" },
        { userId: member.id, taskId, durationMinutes: 30, submittedAt: new Date(), approvalStatus: "pending" },
        { userId: member.id, taskId, durationMinutes: 45, submittedAt: null, approvalStatus: "pending" }, // draft, not counted
        { userId: member.id, taskId, durationMinutes: 15, submittedAt: new Date(), approvalStatus: "approved" }, // not counted
      ],
    });
    await tenantDb.expense.create({
      data: { createdById: member.id, projectId, amount: 10, incurredAt: new Date(), approvalStatus: "pending", description: "Taxi" },
    });
    await tenantDb.absenceRequest.create({
      data: { userId: member.id, type: "vacation", startDate: new Date(), endDate: new Date(), status: "pending" },
    });

    setCurrentUser(owner);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.count).toBe(4);
  });
});
