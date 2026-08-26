import crypto from "crypto";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

const VALID_EVENT_TYPES = [
  "task_created",
  "task_status_changed",
  "comment_added",
  "attachment_added",
  "wiki_page_created",
  "wiki_page_updated",
];

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const endpoints = await context.tenantDb.webhookEndpoint.findMany({
    orderBy: { createdAt: "desc" },
    include: { deliveries: { orderBy: { createdAt: "desc" }, take: 5 } },
  });

  return NextResponse.json({
    endpoints: endpoints.map((endpoint) => ({
      id: endpoint.id,
      url: endpoint.url,
      eventTypes: endpoint.eventTypes,
      enabled: endpoint.enabled,
      createdAt: endpoint.createdAt,
      recentDeliveries: endpoint.deliveries,
    })),
  });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.url !== "string" || !Array.isArray(body.eventTypes)) {
    return NextResponse.json({ error: "url und eventTypes sind erforderlich." }, { status: 400 });
  }
  if (body.eventTypes.some((type: unknown) => !VALID_EVENT_TYPES.includes(type as string))) {
    return NextResponse.json({ error: "Ungültiger eventType." }, { status: 400 });
  }

  const secret = crypto.randomBytes(32).toString("hex");
  const endpoint = await context.tenantDb.webhookEndpoint.create({
    data: { url: body.url, secret, eventTypes: body.eventTypes },
  });

  return NextResponse.json(
    { endpoint: { id: endpoint.id, url: endpoint.url, eventTypes: endpoint.eventTypes, enabled: endpoint.enabled, secret } },
    { status: 201 },
  );
}
