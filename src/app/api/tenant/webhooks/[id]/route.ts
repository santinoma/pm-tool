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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (body.eventTypes && body.eventTypes.some((type: unknown) => !VALID_EVENT_TYPES.includes(type as string))) {
    return NextResponse.json({ error: "Ungültiger eventType." }, { status: 400 });
  }

  const endpoint = await context.tenantDb.webhookEndpoint.update({
    where: { id },
    data: {
      url: typeof body.url === "string" ? body.url : undefined,
      eventTypes: Array.isArray(body.eventTypes) ? body.eventTypes : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    },
  });

  return NextResponse.json({
    endpoint: { id: endpoint.id, url: endpoint.url, eventTypes: endpoint.eventTypes, enabled: endpoint.enabled },
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  await context.tenantDb.webhookDelivery.deleteMany({ where: { endpointId: id } });
  await context.tenantDb.webhookEndpoint.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
