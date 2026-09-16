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
import { PATCH, DELETE } from "@/app/api/tenant/time-entries/[id]/route";
import { PATCH as REJECT } from "@/app/api/tenant/time-entries/[id]/reject/route";

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

function patchRequest(id: string, body: unknown) {
  return PATCH(
    new Request(`http://tenant.local/api/tenant/time-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function deleteRequest(id: string) {
  return DELETE(new Request(`http://tenant.local/api/tenant/time-entries/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });
}

function rejectRequest(id: string, body: unknown = {}) {
  return REJECT(
    new Request(`http://tenant.local/api/tenant/time-entries/${id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(async () => {
  const subdomain = `entry-immutability-${Date.now()}`;
  await provisionTenant({ name: "Immutability Kunde", subdomain, ownerEmail: "owner@example.com" });
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

describe("approved time entries are immutable", () => {
  it("rejects a PATCH on an approved entry", async () => {
    const entry = await tenantDb.timeEntry.create({
      data: { userId: member.id, taskId, durationMinutes: 60, approvalStatus: "approved" },
    });
    setCurrentUser(member);

    const response = await patchRequest(entry.id, { durationMinutes: 90 });
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain("nicht mehr geändert");

    const unchanged = await tenantDb.timeEntry.findUnique({ where: { id: entry.id } });
    expect(unchanged?.durationMinutes).toBe(60);
  });

  it("rejects a DELETE on an approved entry", async () => {
    const entry = await tenantDb.timeEntry.create({
      data: { userId: member.id, taskId, durationMinutes: 60, approvalStatus: "approved" },
    });
    setCurrentUser(member);

    const response = await deleteRequest(entry.id);
    expect(response.status).toBe(409);

    const stillThere = await tenantDb.timeEntry.findUnique({ where: { id: entry.id } });
    expect(stillThere).not.toBeNull();
  });

  it("still allows editing a pending entry", async () => {
    const entry = await tenantDb.timeEntry.create({
      data: { userId: member.id, taskId, durationMinutes: 60, approvalStatus: "pending" },
    });
    setCurrentUser(member);

    const response = await patchRequest(entry.id, { durationMinutes: 45 });
    expect(response.status).toBe(200);
    const { entry: updated } = await response.json();
    expect(updated.durationMinutes).toBe(45);
  });
});

describe("editing a rejected entry resubmits it", () => {
  it("clears the rejection and sends it back to pending on save", async () => {
    const entry = await tenantDb.timeEntry.create({
      data: {
        userId: member.id,
        taskId,
        durationMinutes: 60,
        approvalStatus: "rejected",
        rejectionReason: "Bitte Beschreibung ergänzen",
        submittedAt: null,
      },
    });
    setCurrentUser(member);

    const response = await patchRequest(entry.id, { durationMinutes: 75, description: "Konzept überarbeitet" });
    expect(response.status).toBe(200);
    const { entry: updated } = await response.json();
    expect(updated.durationMinutes).toBe(75);
    expect(updated.approvalStatus).toBe("pending");
    expect(updated.rejectionReason).toBeNull();
    expect(updated.submittedAt).not.toBeNull();
  });
});

describe("rejecting an entry notifies the submitter", () => {
  it("creates a notification for the entry owner with the rejection reason", async () => {
    const entry = await tenantDb.timeEntry.create({
      data: { userId: member.id, taskId, durationMinutes: 60, submittedAt: new Date(), approvalStatus: "pending" },
    });
    setCurrentUser(owner);

    const response = await rejectRequest(entry.id, { reason: "Bitte Task korrigieren" });
    expect(response.status).toBe(200);

    const activityEvents = await tenantDb.activityEvent.findMany({ where: { type: "time_entry_rejected" } });
    expect(activityEvents).toHaveLength(1);
    expect(activityEvents[0].summary).toContain("Bitte Task korrigieren");

    const notifications = await tenantDb.notification.findMany({ where: { activityEventId: activityEvents[0].id } });
    expect(notifications.some((n) => n.userId === member.id)).toBe(true);
  });
});
