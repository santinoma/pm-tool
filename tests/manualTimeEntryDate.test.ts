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
import { POST } from "@/app/api/tenant/time-entries/route";

let tenant: Tenant;
let tenantDb: PrismaClient;
let projectId: string;
let taskId: string;
let owner: User;

function setCurrentUser(user: User) {
  vi.mocked(getTenantContext).mockResolvedValue({
    tenantDb,
    currentUser: user,
    entitledFeatures: new Set(),
  });
}

function jsonRequest(body: unknown) {
  return new Request("http://tenant.local/api/tenant/time-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  const subdomain = `manual-entry-date-${Date.now()}`;
  await provisionTenant({ name: "Manual Entry Date Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
  tenantDb = getTenantDbClient(tenant.dbUrl);

  owner = await tenantDb.user.create({ data: { email: "owner@example.com", role: "owner" } });
  const project = await tenantDb.project.create({
    data: { name: "Manual Entry Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
    include: { workflow: { include: { statuses: true } } },
  });
  projectId = project.id;
  const task = await tenantDb.task.create({
    data: { title: "Task", statusId: project.workflow.statuses[0].id, projects: { create: { projectId } } },
  });
  taskId = task.id;
  setCurrentUser(owner);
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("manual time entry — explicit date", () => {
  it("persists the requested date instead of always using createdAt", async () => {
    const response = await POST(jsonRequest({ taskId, durationMinutes: 30, date: "2026-08-27" }));
    expect(response.status).toBe(201);
    const { entry } = await response.json();
    expect(entry.startedAt).not.toBeNull();
    expect(new Date(entry.startedAt).toISOString().slice(0, 10)).toBe("2026-08-27");
  });

  it("enforces blockWeekends against the requested date, not today", async () => {
    await tenantDb.timeTrackingPolicy.create({ data: { blockWeekends: true } });
    // 2026-08-29 is a Saturday.
    const response = await POST(jsonRequest({ taskId, durationMinutes: 30, date: "2026-08-29" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Wochenende");
  });

  it("still allows a weekday entry when blockWeekends is on", async () => {
    await tenantDb.timeTrackingPolicy.create({ data: { blockWeekends: true } });
    // 2026-08-27 is a Thursday.
    const response = await POST(jsonRequest({ taskId, durationMinutes: 30, date: "2026-08-27" }));
    expect(response.status).toBe(201);
  });

  it("rejects a malformed date", async () => {
    const response = await POST(jsonRequest({ taskId, durationMinutes: 30, date: "not-a-date" }));
    expect(response.status).toBe(400);
  });

  it("defaults to today when no date is given (unchanged legacy behavior)", async () => {
    const response = await POST(jsonRequest({ taskId, durationMinutes: 30 }));
    expect(response.status).toBe(201);
    const { entry } = await response.json();
    expect(entry.startedAt).toBeNull();
  });
});
