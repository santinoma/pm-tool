import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { recordAuditEntry } from "@/tenant/auditLog/recordAuditEntry";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const key = await context.tenantDb.apiKey.findUnique({ where: { id } });
  if (!key || key.userId !== context.currentUser.id) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  await context.tenantDb.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });

  try {
    await recordAuditEntry(context.tenantDb, {
      actorId: context.currentUser.id,
      action: "api_key_revoked",
      entityType: "ApiKey",
      entityId: key.id,
      summary: `API-Key "${key.name}" widerrufen`,
    });
  } catch {
    // Audit-Logging darf die eigentliche Aktion nie blockieren.
  }

  return NextResponse.json({ success: true });
}
