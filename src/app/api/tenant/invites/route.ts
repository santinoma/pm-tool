import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { type RoleName } from "@/tenant/auth/roleGuard";
import { buildInviteUrl, computeInviteExpiry, generateInviteToken } from "@/tenant/auth/invite";
import { hasFeature } from "@/tenant/entitlements/features";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";

const INVITABLE_ROLES: RoleName[] = ["admin", "member", "client"];

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
  const grantedProjectIds = Array.isArray(body.grantedProjectIds)
    ? body.grantedProjectIds.filter((id: unknown) => typeof id === "string")
    : [];
  if (body.role === "client" && grantedProjectIds.length === 0) {
    return NextResponse.json({ error: "Für die Rolle 'client' ist mindestens ein Projekt erforderlich." }, { status: 400 });
  }
  if (body.role === "client" && !hasFeature(context.entitledFeatures, "client_portal")) {
    return NextResponse.json({ error: "Client-Portal ist im aktuellen Plan nicht enthalten." }, { status: 403 });
  }

  const headerSubdomain = request.headers.get("x-tenant-subdomain") ?? "";
  const token = generateInviteToken();

  const invite = await context.tenantDb.invite.create({
    data: {
      email: body.email,
      role: body.role,
      token,
      expiresAt: computeInviteExpiry(),
      grantedProjectIds: body.role === "client" ? grantedProjectIds : [],
    },
  });

  const inviteUrl = buildInviteUrl(process.env.BASE_DOMAIN ?? "localhost", headerSubdomain, token);
  return NextResponse.json({ invite, inviteUrl }, { status: 201 });
}
