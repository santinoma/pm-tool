import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { defaultWorkflowStatuses } from "../src/tenant/projects/workflow";
import { extractMentionedEmails } from "../src/tenant/collaboration/mentions";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let authorId: string;
let mentionedUserId: string;
let taskId: string;

beforeEach(async () => {
  const subdomain = `comments-${Date.now()}`;
  await provisionTenant({ name: "Comments Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const author = await tenantDb.user.create({ data: { email: "author@example.com", role: "member" } });
  authorId = author.id;
  const mentionedUser = await tenantDb.user.create({
    data: { email: "alice@example.com", role: "member" },
  });
  mentionedUserId = mentionedUser.id;

  const project = await tenantDb.project.create({
    data: { name: "Comments Project", statuses: { create: defaultWorkflowStatuses() } },
    include: { statuses: true },
  });
  const task = await tenantDb.task.create({
    data: {
      title: "Task",
      statusId: project.statuses[0].id,
      projects: { create: { projectId: project.id } },
    },
  });
  taskId = task.id;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("comments and mentions (data layer, mirrors the API route logic)", () => {
  it("creates a comment on a task", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const comment = await tenantDb.comment.create({
      data: { taskId, authorId, body: "Looks good to me" },
    });
    expect(comment.body).toBe("Looks good to me");
  });

  it("creates a mention record for a known mentioned email", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const body = "please review @alice@example.com";
    const comment = await tenantDb.comment.create({ data: { taskId, authorId, body } });

    const emails = extractMentionedEmails(body);
    const matched = await tenantDb.user.findMany({ where: { email: { in: emails } } });
    await tenantDb.mention.createMany({
      data: matched.map((user) => ({ commentId: comment.id, userId: user.id })),
    });

    const mentions = await tenantDb.mention.findMany({ where: { commentId: comment.id } });
    expect(mentions).toHaveLength(1);
    expect(mentions[0].userId).toBe(mentionedUserId);
  });

  it("creates no mention for an unknown email, without throwing", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const body = "cc @unknown@nowhere.com";
    const comment = await tenantDb.comment.create({ data: { taskId, authorId, body } });

    const emails = extractMentionedEmails(body);
    const matched = await tenantDb.user.findMany({ where: { email: { in: emails } } });
    expect(matched).toHaveLength(0);

    const mentions = await tenantDb.mention.findMany({ where: { commentId: comment.id } });
    expect(mentions).toHaveLength(0);
  });
});
