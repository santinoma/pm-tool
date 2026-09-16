import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";
import { canManageMembers } from "@/tenant/auth/roleGuard";
import { hasFeature } from "@/tenant/entitlements/features";

const VALID_TIME_TRACKING_MODES = ["timer", "entries"];

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const settings = await getOrCreateTenantSettings(context.tenantDb);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const moduleToggleKeys = ["crmEnabled", "reportsEnabled", "resourcingEnabled"] as const;
  const hasModuleToggle = moduleToggleKeys.some((key) => body?.[key] !== undefined);
  if (
    !body ||
    (body.allowProjectLevelTimeEntries === undefined &&
      body.currency === undefined &&
      body.triageEnabled === undefined &&
      body.timeTrackingMode === undefined &&
      body.require2fa === undefined &&
      body.timeApprovalEnabled === undefined &&
      !hasModuleToggle)
  ) {
    return NextResponse.json(
      {
        error:
          "allowProjectLevelTimeEntries (boolean), currency (string), triageEnabled (boolean), timeTrackingMode ('timer'|'entries'), require2fa (boolean), timeApprovalEnabled (boolean) oder ein Modul-Flag (crmEnabled/reportsEnabled/resourcingEnabled, boolean) ist erforderlich.",
      },
      { status: 400 },
    );
  }
  if (body.timeApprovalEnabled !== undefined && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  if (body.timeTrackingMode !== undefined && !VALID_TIME_TRACKING_MODES.includes(body.timeTrackingMode)) {
    return NextResponse.json({ error: "Ungültiger timeTrackingMode." }, { status: 400 });
  }
  if (body.require2fa !== undefined && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  if (body.require2fa === true && !hasFeature(context.entitledFeatures, "two_factor_scim")) {
    return NextResponse.json({ error: "2FA/SCIM ist im aktuellen Plan nicht enthalten." }, { status: 403 });
  }
  if (hasModuleToggle && !canManageMembers(context.currentUser.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const current = await getOrCreateTenantSettings(context.tenantDb);
  const updated = await context.tenantDb.tenantSettings.update({
    where: { id: current.id },
    data: {
      allowProjectLevelTimeEntries:
        typeof body.allowProjectLevelTimeEntries === "boolean"
          ? body.allowProjectLevelTimeEntries
          : undefined,
      currency: typeof body.currency === "string" ? body.currency : undefined,
      triageEnabled: typeof body.triageEnabled === "boolean" ? body.triageEnabled : undefined,
      timeTrackingMode:
        typeof body.timeTrackingMode === "string" ? body.timeTrackingMode : undefined,
      require2fa: typeof body.require2fa === "boolean" ? body.require2fa : undefined,
      timeApprovalEnabled: typeof body.timeApprovalEnabled === "boolean" ? body.timeApprovalEnabled : undefined,
      crmEnabled: typeof body.crmEnabled === "boolean" ? body.crmEnabled : undefined,
      reportsEnabled: typeof body.reportsEnabled === "boolean" ? body.reportsEnabled : undefined,
      resourcingEnabled: typeof body.resourcingEnabled === "boolean" ? body.resourcingEnabled : undefined,
    },
  });

  return NextResponse.json({ settings: updated });
}
