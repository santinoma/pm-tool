import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { type RoleName } from "@/tenant/auth/roleGuard";
import { buildInviteUrl, computeInviteExpiry, generateInviteToken } from "@/tenant/auth/invite";
import { hasFeature } from "@/tenant/entitlements/features";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { getTenantById } from "@/platform/tenantRegistry";
import { PAID_SEAT_ROLES, countPaidSeats } from "@/tenant/billing/seats";
import { isRoleAllowedForEmploymentType, type EmploymentTypeName } from "@/tenant/auth/employmentType";

const INVITABLE_ROLES: RoleName[] = ["admin", "member", "client"];
const VALID_EMPLOYMENT_TYPES: EmploymentTypeName[] = ["employee", "contractor"];

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canInvite = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "members_invite",
  );
  if (!canInvite) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string" || !INVITABLE_ROLES.includes(body.role)) {
    return NextResponse.json(
      { error: "E-Mail und eine gültige Rolle (admin/member/client) sind erforderlich." },
      { status: 400 },
    );
  }
  const employmentType: EmploymentTypeName =
    typeof body.employmentType === "string" && VALID_EMPLOYMENT_TYPES.includes(body.employmentType)
      ? body.employmentType
      : "employee";
  if (!isRoleAllowedForEmploymentType(body.role, employmentType)) {
    return NextResponse.json(
      { error: "Contractors können nicht als admin eingeladen werden — nur ein festes Berechtigungsprofil (member)." },
      { status: 400 },
    );
  }

  const grantedProjectIds = Array.isArray(body.grantedProjectIds)
    ? body.grantedProjectIds.filter((id: unknown) => typeof id === "string")
    : [];
  if (body.role === "client" && grantedProjectIds.length === 0) {
    return NextResponse.json({ error: "Für die Rolle 'client' ist mindestens ein Projekt erforderlich." }, { status: 400 });
  }
  if (body.role === "client" && !hasFeature(context.entitledFeatures, "client_portal")) {
    return NextResponse.json({ error: "Client-Portal ist im aktuellen Plan nicht enthalten." }, { status: 403 });
  }

  if (PAID_SEAT_ROLES.includes(body.role as RoleName)) {
    const tenantId = request.headers.get("x-tenant-id");
    const tenant = tenantId ? await getTenantById(tenantId) : null;
    if (tenant?.seatLimit != null) {
      const usedSeats = await countPaidSeats(context.tenantDb);
      if (usedSeats >= tenant.seatLimit) {
        return NextResponse.json(
          { error: `Sitzplatz-Limit erreicht (${tenant.seatLimit}). Bitte ein bestehendes Mitglied deaktivieren oder das Limit erhöhen lassen.` },
          { status: 402 },
        );
      }
    }
  }

  const headerSubdomain = request.headers.get("x-tenant-subdomain") ?? "";
  const token = generateInviteToken();

  const invite = await context.tenantDb.invite.create({
    data: {
      email: body.email,
      role: body.role,
      employmentType,
      token,
      expiresAt: computeInviteExpiry(),
      grantedProjectIds: body.role === "client" ? grantedProjectIds : [],
    },
  });

  const inviteUrl = buildInviteUrl(process.env.BASE_DOMAIN ?? "localhost", headerSubdomain, token);
  return NextResponse.json({ invite, inviteUrl }, { status: 201 });
}
