import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getTenantBySubdomain } from "@/platform/tenantRegistry";
import { getTenantDbClient } from "@/tenant/tenantDb";
import { verifyPassword } from "@/tenant/auth/password";
import { buildSessionCookie, computeSessionExpiry } from "@/tenant/auth/session";
import { applySessionCookie } from "@/tenant/auth/applySessionCookie";
import { computePendingLoginExpiry } from "@/tenant/auth/pendingLogin";
import { isPasswordLoginAllowed } from "@/tenant/sso/ssoEligibility";

const GENERIC_ERROR = "E-Mail oder Passwort ist falsch.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain");
  const tenant = subdomain ? await getTenantBySubdomain(subdomain) : null;
  if (!tenant) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const user = await tenantDb.user.findUnique({ where: { email: body.email } });

  if (
    !user ||
    !user.isActive ||
    !user.passwordHash ||
    !(await verifyPassword(body.password, user.passwordHash))
  ) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const ssoConfig = await tenantDb.ssoConfig.findFirst();
  if (ssoConfig?.enforceSso && !isPasswordLoginAllowed(user, ssoConfig.enforceSso)) {
    return NextResponse.json(
      { error: "Diese Organisation erfordert die Anmeldung über SSO." },
      { status: 403 },
    );
  }

  if (user.totpEnabled) {
    const pending = await tenantDb.pendingLogin.create({
      data: { userId: user.id, expiresAt: computePendingLoginExpiry() },
    });
    return NextResponse.json({ requires2fa: true, pendingLoginId: pending.id }, { status: 200 });
  }

  const expiresAt = computeSessionExpiry();
  const now = new Date();
  const session = await tenantDb.session.create({
    data: {
      userId: user.id,
      expiresAt,
      userAgent: headerList.get("user-agent"),
      lastSeenAt: now,
    },
  });

  const response = NextResponse.json({ userId: user.id }, { status: 200 });
  applySessionCookie(response, buildSessionCookie(session.id, expiresAt));
  return response;
}
