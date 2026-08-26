import crypto from "crypto";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { findIntegrationTemplate } from "@/tenant/integrations/templates";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const installed = await context.tenantDb.webhookEndpoint.findMany({
    where: { integrationTemplateKey: { not: null } },
  });
  return NextResponse.json({
    installedTemplateKeys: installed.map((endpoint) => endpoint.integrationTemplateKey),
  });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManageIntegrations = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "integrations_manage",
  );
  if (!canManageIntegrations) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.templateKey !== "string" || typeof body.url !== "string") {
    return NextResponse.json({ error: "templateKey und url sind erforderlich." }, { status: 400 });
  }

  const template = findIntegrationTemplate(body.templateKey);
  if (!template) {
    return NextResponse.json({ error: "Unbekannte Vorlage." }, { status: 400 });
  }

  const secret = crypto.randomBytes(32).toString("hex");
  const endpoint = await context.tenantDb.webhookEndpoint.create({
    data: {
      url: body.url,
      secret,
      eventTypes: template.eventTypes,
      integrationTemplateKey: template.key,
    },
  });

  return NextResponse.json({ endpoint: { id: endpoint.id, url: endpoint.url } }, { status: 201 });
}
