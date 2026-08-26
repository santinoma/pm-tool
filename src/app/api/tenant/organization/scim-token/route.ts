import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { generateInviteToken } from "@/tenant/auth/invite";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";

export async function POST() {
  const context = await getTenantContext();
  if (!context?.currentUser || !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const current = await getOrCreateTenantSettings(context.tenantDb);
  const token = generateInviteToken();
  const settings = await context.tenantDb.tenantSettings.update({
    where: { id: current.id },
    data: { scimBearerToken: token },
  });

  return NextResponse.json({ scimBearerToken: settings.scimBearerToken });
}
