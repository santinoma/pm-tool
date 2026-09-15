import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { computePeriodKey } from "../src/tenant/checkIns/period";
import { canManageMembers } from "../src/tenant/auth/roleGuard";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let userId: string;

beforeEach(async () => {
  const subdomain = `checkins-${Date.now()}`;
  await provisionTenant({ name: "Check-ins Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const user = await tenantDb.user.create({ data: { email: "member@example.com", role: "member" } });
  userId = user.id;

  const project = await tenantDb.project.create({
    data: { name: "Check-ins Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
  });
  projectId = project.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("check-in schedules and responses (data layer, mirrors the API route logic)", () => {
  it("a member role cannot create a schedule (mirrors the 403 check)", () => {
    expect(canManageMembers("member")).toBe(false);
  });

  it("owner/admin can create a schedule", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const schedule = await tenantDb.checkInSchedule.create({
      data: { projectId, question: "Was hast du diese Woche gemacht?", recurrence: "weekly" },
    });
    expect(schedule.question).toBe("Was hast du diese Woche gemacht?");
  });

  it("upserts a response for the same schedule/user/period instead of duplicating", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const schedule = await tenantDb.checkInSchedule.create({
      data: { projectId, question: "Status?", recurrence: "daily" },
    });
    const periodKey = computePeriodKey(new Date(), schedule.recurrence);

    await tenantDb.checkInResponse.upsert({
      where: { scheduleId_userId_periodKey: { scheduleId: schedule.id, userId, periodKey } },
      create: { scheduleId: schedule.id, userId, periodKey, answer: "First answer" },
      update: { answer: "First answer" },
    });
    await tenantDb.checkInResponse.upsert({
      where: { scheduleId_userId_periodKey: { scheduleId: schedule.id, userId, periodKey } },
      create: { scheduleId: schedule.id, userId, periodKey, answer: "Updated answer" },
      update: { answer: "Updated answer" },
    });

    const responses = await tenantDb.checkInResponse.findMany({ where: { scheduleId: schedule.id, userId } });
    expect(responses).toHaveLength(1);
    expect(responses[0].answer).toBe("Updated answer");
  });

  it("a schedule with no response for the current period is 'pending' for that user", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const schedule = await tenantDb.checkInSchedule.create({
      data: { projectId, question: "Status?", recurrence: "daily" },
    });
    const periodKey = computePeriodKey(new Date(), schedule.recurrence);

    const existing = await tenantDb.checkInResponse.findUnique({
      where: { scheduleId_userId_periodKey: { scheduleId: schedule.id, userId, periodKey } },
    });
    expect(existing).toBeNull();

    await tenantDb.checkInResponse.create({
      data: { scheduleId: schedule.id, userId, periodKey, answer: "Done" },
    });
    const afterAnswer = await tenantDb.checkInResponse.findUnique({
      where: { scheduleId_userId_periodKey: { scheduleId: schedule.id, userId, periodKey } },
    });
    expect(afterAnswer).not.toBeNull();
  });
});
