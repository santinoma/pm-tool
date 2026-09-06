import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";

export async function PATCH(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.enforceSso !== "boolean") {
    return NextResponse.json({ error: "enforceSso (boolean) ist erforderlich." }, { status: 400 });
  }

  const existing = await context.tenantDb.ssoConfig.findFirst();
  if (!existing) {
    return NextResponse.json({ error: "SSO ist noch nicht konfiguriert." }, { status: 400 });
  }
  if (body.enforceSso === true && !existing.enabled) {
    return NextResponse.json(
      { error: "SSO muss zuerst aktiviert und getestet werden, bevor es erzwungen werden kann." },
      { status: 400 },
    );
  }

  const config = await context.tenantDb.ssoConfig.update({
    where: { id: existing.id },
    data: { enforceSso: body.enforceSso },
  });

  return NextResponse.json({ config });
}
