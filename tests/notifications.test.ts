import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { recordActivity } from "../src/tenant/notifications/recordActivity";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let actorId: string;
let allUserId: string;
let mentionsUserId: string;
let offUserId: string;

beforeEach(async () => {
  const subdomain = `notifications-${Date.now()}`;
  await provisionTenant({ name: "Notifications Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const actor = await tenantDb.user.create({ data: { email: "actor@example.com", role: "member" } });
  actorId = actor.id;
  const allUser = await tenantDb.user.create({ data: { email: "all@example.com", role: "member" } });
  allUserId = allUser.id;
  const mentionsUser = await tenantDb.user.create({
    data: { email: "mentions@example.com", role: "member" },
  });
  mentionsUserId = mentionsUser.id;
  const offUser = await tenantDb.user.create({ data: { email: "off@example.com", role: "member" } });
  offUserId = offUser.id;

  const project = await tenantDb.project.create({
    data: { name: "Project", workflow: { create: { name: "Test Workflow", statuses: { create: defaultWorkflowStatuses() } } } },
    include: { workflow: { include: { statuses: true } } },
  });
  projectId = project.id;

  await tenantDb.notificationPreference.create({
    data: { userId: mentionsUserId, projectId, level: "mentions" },
  });
  await tenantDb.notificationPreference.create({
    data: { userId: offUserId, projectId, level: "off" },
  });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("recordActivity", () => {
  it("creates an ActivityEvent and notifies the default 'all' user but not the actor", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await recordActivity(tenantDb, {
      projectId,
      actorId,
      type: "comment_added",
      summary: "actor commented",
    });

    const events = await tenantDb.activityEvent.findMany({ where: { projectId } });
    expect(events).toHaveLength(1);

    const notifications = await tenantDb.notification.findMany({
      where: { activityEventId: events[0].id },
    });
    const notifiedUserIds = notifications.map((n) => n.userId);
    expect(notifiedUserIds).toContain(allUserId);
    expect(notifiedUserIds).not.toContain(actorId);
    expect(notifiedUserIds).not.toContain(mentionsUserId);
    expect(notifiedUserIds).not.toContain(offUserId);
  });

  it("notifies a 'mentions' user only when individually mentioned", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await recordActivity(tenantDb, {
      projectId,
      actorId,
      type: "comment_added",
      summary: "actor mentioned someone",
      mentionedUserIds: [mentionsUserId],
    });

    const event = await tenantDb.activityEvent.findFirstOrThrow({ where: { projectId } });
    const notifications = await tenantDb.notification.findMany({ where: { activityEventId: event.id } });
    expect(notifications.map((n) => n.userId)).toContain(mentionsUserId);
  });

  it("broadcast reaches 'all' and 'mentions' users but never the 'off' user", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    await recordActivity(tenantDb, {
      projectId,
      actorId,
      type: "comment_added",
      summary: "actor broadcast",
      isBroadcast: true,
    });

    const event = await tenantDb.activityEvent.findFirstOrThrow({ where: { projectId } });
    const notifications = await tenantDb.notification.findMany({ where: { activityEventId: event.id } });
    const notifiedUserIds = notifications.map((n) => n.userId);
    expect(notifiedUserIds).toContain(allUserId);
    expect(notifiedUserIds).toContain(mentionsUserId);
    expect(notifiedUserIds).not.toContain(offUserId);
  });
});
