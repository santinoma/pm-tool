import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { verifySlackSignature } from "../src/tenant/slackCapture/verifySignature";
import { buildTaskDraft } from "../src/tenant/slackCapture/buildTaskDraft";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;
let projectId: string;
let statusId: string;
let signingSecret: string;

function signBody(secret: string, timestamp: string, body: string): string {
  return `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex")}`;
}

beforeEach(async () => {
  const subdomain = `slackcapture-${Date.now()}`;
  await provisionTenant({ name: "Slack Capture Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const project = await tenantDb.project.create({ data: { name: "Inbox" } });
  projectId = project.id;
  const status = await tenantDb.workflowStatus.create({
    data: { projectId, name: "Todo", category: "not_started", position: 0, isDefault: true },
  });
  statusId = status.id;

  signingSecret = "test-signing-secret";
  await tenantDb.slackCaptureConfig.create({
    data: { signingSecret, defaultProjectId: projectId, enabled: true },
  });
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

describe("Slack capture (data layer, mirrors /api/tenant/integrations/slack/capture)", () => {
  it("a validly signed payload produces a task with the expected fields", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const payload = {
      text: "Can we add CSV export?\nWould save a lot of manual work.",
      userName: "jane",
      channelName: "feature-requests",
      permalink: "https://example.slack.com/archives/C1/p123",
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signBody(signingSecret, timestamp, rawBody);

    expect(verifySlackSignature(signingSecret, timestamp, rawBody, signature)).toBe(true);

    const draft = buildTaskDraft(payload);
    const task = await tenantDb.task.create({
      data: {
        title: draft.title,
        description: draft.description,
        externalSourceUrl: draft.externalSourceUrl,
        statusId,
        projects: { create: { projectId, isPrimary: true } },
      },
    });

    expect(task.title).toBe("Can we add CSV export?");
    expect(task.externalSourceUrl).toBe(payload.permalink);
    expect(task.description).toContain("Quelle: Slack (#feature-requests), von @jane");
  });

  it("a signature computed with the wrong secret is rejected", () => {
    const rawBody = JSON.stringify({ text: "x", userName: "jane", channelName: "c", permalink: "https://x" });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signBody("wrong-secret", timestamp, rawBody);

    expect(verifySlackSignature(signingSecret, timestamp, rawBody, signature)).toBe(false);
  });

  it("a disabled config would not accept captures", async () => {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const config = await tenantDb.slackCaptureConfig.findFirstOrThrow();
    await tenantDb.slackCaptureConfig.update({ where: { id: config.id }, data: { enabled: false } });

    const refetched = await tenantDb.slackCaptureConfig.findFirstOrThrow();
    expect(refetched.enabled).toBe(false);
  });
});
