import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { validateSsoConfigInput } from "@/tenant/sso/ssoConfigValidation";
import { buildAcsUrl, buildSpEntityId, resolveBaseDomain } from "@/tenant/sso/samlServiceProvider";
import { headers } from "next/headers";
import { recordAuditEntry } from "@/tenant/auditLog/recordAuditEntry";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const config = await context.tenantDb.ssoConfig.findFirst();

  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain") ?? "";
  const baseDomain = resolveBaseDomain();

  return NextResponse.json({
    config,
    metadataUrl: buildSpEntityId(subdomain, baseDomain),
    acsUrl: buildAcsUrl(subdomain, baseDomain),
  });
}

export async function PUT(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const validation = validateSsoConfigInput(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const existing = await context.tenantDb.ssoConfig.findFirst();
  const data = {
    provider: body.provider as string,
    entryPoint: body.entryPoint as string,
    issuer: body.issuer as string,
    cert: body.cert as string,
    enabled: typeof body.enabled === "boolean" ? body.enabled : (existing?.enabled ?? false),
  };

  const config = existing
    ? await context.tenantDb.ssoConfig.update({ where: { id: existing.id }, data })
    : await context.tenantDb.ssoConfig.create({ data });

  try {
    await recordAuditEntry(context.tenantDb, {
      actorId: context.currentUser.id,
      action: existing ? "sso_config_updated" : "sso_config_created",
      entityType: "SsoConfig",
      entityId: config.id,
      summary: `SSO-Konfiguration (${config.provider}) ${existing ? "aktualisiert" : "angelegt"} — ${config.enabled ? "aktiviert" : "deaktiviert"}`,
    });
  } catch {
    // Audit-Logging darf die eigentliche Aktion nie blockieren.
  }

  return NextResponse.json({ config });
}
