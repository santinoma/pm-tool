import { afterEach, beforeEach, describe, expect, it } from "vitest";
import http from "http";
import { platformDb } from "../src/platform/db";
import { provisionTenant } from "../src/platform/provisionTenant";
import { getTenantBySubdomain } from "../src/platform/tenantRegistry";
import { getTenantDbClient } from "../src/tenant/tenantDb";
import { dispatchWebhooks } from "../src/tenant/webhooks/dispatch";
import { signPayload } from "../src/tenant/webhooks/signature";
import type { Tenant } from "../src/platform/tenantRegistry";

let tenant: Tenant;

beforeEach(async () => {
  const subdomain = `webhooksdispatch-${Date.now()}`;
  await provisionTenant({ name: "Webhooks Kunde", subdomain, ownerEmail: "owner@example.com" });
  tenant = (await getTenantBySubdomain(subdomain))!;
});

afterEach(async () => {
  await platformDb.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
});

function startServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}

const EVENT = {
  id: "event-1",
  type: "task_created" as const,
  summary: "Task created",
  projectId: "project-1",
  actorId: "actor-1",
  createdAt: new Date("2026-08-25T00:00:00.000Z"),
};

describe("dispatchWebhooks", () => {
  it("delivers successfully to an enabled endpoint subscribed to the event type", async () => {
    let receivedBody = "";
    let receivedSignature = "";
    const server = await startServer((req, res) => {
      let chunks = "";
      req.on("data", (chunk) => (chunks += chunk));
      req.on("end", () => {
        receivedBody = chunks;
        receivedSignature = req.headers["x-webhook-signature"] as string;
        res.writeHead(200);
        res.end();
      });
    });

    try {
      const tenantDb = getTenantDbClient(tenant.dbUrl);
      const endpoint = await tenantDb.webhookEndpoint.create({
        data: { url: server.url, secret: "test-secret", eventTypes: ["task_created"] },
      });

      await dispatchWebhooks(tenantDb, EVENT);

      const deliveries = await tenantDb.webhookDelivery.findMany({ where: { endpointId: endpoint.id } });
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].success).toBe(true);
      expect(deliveries[0].statusCode).toBe(200);
      expect(signPayload(receivedBody, "test-secret")).toBe(receivedSignature);
    } finally {
      await server.close();
    }
  });

  it("retries on failure and succeeds on the third attempt", async () => {
    let callCount = 0;
    const server = await startServer((req, res) => {
      callCount += 1;
      req.on("data", () => undefined);
      req.on("end", () => {
        if (callCount < 3) {
          res.writeHead(500);
          res.end();
        } else {
          res.writeHead(200);
          res.end();
        }
      });
    });

    try {
      const tenantDb = getTenantDbClient(tenant.dbUrl);
      const endpoint = await tenantDb.webhookEndpoint.create({
        data: { url: server.url, secret: "test-secret", eventTypes: ["task_created"] },
      });

      await dispatchWebhooks(tenantDb, EVENT);

      const deliveries = await tenantDb.webhookDelivery.findMany({
        where: { endpointId: endpoint.id },
        orderBy: { attempt: "asc" },
      });
      expect(deliveries).toHaveLength(3);
      expect(deliveries[0].success).toBe(false);
      expect(deliveries[1].success).toBe(false);
      expect(deliveries[2].success).toBe(true);
    } finally {
      await server.close();
    }
  }, 15000);

  it("logs all attempts as failed without throwing when the endpoint always fails", async () => {
    const server = await startServer((req, res) => {
      req.on("data", () => undefined);
      req.on("end", () => {
        res.writeHead(500);
        res.end();
      });
    });

    try {
      const tenantDb = getTenantDbClient(tenant.dbUrl);
      const endpoint = await tenantDb.webhookEndpoint.create({
        data: { url: server.url, secret: "test-secret", eventTypes: ["task_created"] },
      });

      await expect(dispatchWebhooks(tenantDb, EVENT)).resolves.not.toThrow();

      const deliveries = await tenantDb.webhookDelivery.findMany({ where: { endpointId: endpoint.id } });
      expect(deliveries).toHaveLength(3);
      expect(deliveries.every((d) => !d.success)).toBe(true);
    } finally {
      await server.close();
    }
  }, 15000);

  it("does not deliver to a disabled endpoint or one not subscribed to the event type", async () => {
    let calls = 0;
    const server = await startServer((req, res) => {
      calls += 1;
      res.writeHead(200);
      res.end();
    });

    try {
      const tenantDb = getTenantDbClient(tenant.dbUrl);
      await tenantDb.webhookEndpoint.create({
        data: { url: server.url, secret: "s", eventTypes: ["task_created"], enabled: false },
      });
      await tenantDb.webhookEndpoint.create({
        data: { url: server.url, secret: "s", eventTypes: ["comment_added"] },
      });

      await dispatchWebhooks(tenantDb, EVENT);

      expect(calls).toBe(0);
    } finally {
      await server.close();
    }
  });
});
