import type { ActivityEventType, PrismaClient } from "../../generated/tenant-client/client.js";
import { signPayload } from "./signature";

const BACKOFF_MS = [0, 1000, 3000];
const TIMEOUT_MS = 5000;

export interface DispatchEventInput {
  id: string;
  type: ActivityEventType;
  summary: string;
  projectId: string;
  actorId: string;
  createdAt: Date;
}

async function attemptDelivery(url: string, body: string, signature: string): Promise<{ statusCode?: number; errorMessage?: string; success: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Webhook-Signature": signature },
      body,
      signal: controller.signal,
    });
    return { statusCode: response.status, success: response.ok };
  } catch (error) {
    return { errorMessage: error instanceof Error ? error.message : "Unknown error", success: false };
  } finally {
    clearTimeout(timeout);
  }
}

export async function dispatchWebhooks(tenantDb: PrismaClient, event: DispatchEventInput): Promise<void> {
  const endpoints = await tenantDb.webhookEndpoint.findMany({
    where: { enabled: true, eventTypes: { has: event.type } },
  });

  const body = JSON.stringify({
    id: event.id,
    type: event.type,
    summary: event.summary,
    projectId: event.projectId,
    actorId: event.actorId,
    createdAt: event.createdAt.toISOString(),
  });

  for (const endpoint of endpoints) {
    const signature = signPayload(body, endpoint.secret);

    for (let attempt = 1; attempt <= BACKOFF_MS.length; attempt++) {
      if (BACKOFF_MS[attempt - 1] > 0) {
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt - 1]));
      }

      const result = await attemptDelivery(endpoint.url, body, signature);

      await tenantDb.webhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          activityEventId: event.id,
          attempt,
          statusCode: result.statusCode ?? null,
          errorMessage: result.errorMessage ?? null,
          success: result.success,
        },
      });

      if (result.success) break;
    }
  }
}
