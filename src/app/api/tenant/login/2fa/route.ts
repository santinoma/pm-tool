import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getTenantBySubdomain } from "@/platform/tenantRegistry";
import { getTenantDbClient } from "@/tenant/tenantDb";
import { verifyTotpCode } from "@/tenant/auth/totp";
import { isPendingLoginValid } from "@/tenant/auth/pendingLogin";
import { buildSessionCookie, computeSessionExpiry } from "@/tenant/auth/session";
import { applySessionCookie } from "@/tenant/auth/applySessionCookie";

const GENERIC_ERROR = "Ungültiger oder abgelaufener Anmeldeversuch.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.pendingLoginId !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain");
  const tenant = subdomain ? await getTenantBySubdomain(subdomain) : null;
  if (!tenant) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const pending = await tenantDb.pendingLogin.findUnique({
    where: { id: body.pendingLoginId },
    include: { user: true },
  });
  if (!pending || !isPendingLoginValid(pending.expiresAt)) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }
  if (!pending.user.totpSecret || !verifyTotpCode(pending.user.totpSecret, body.code)) {
    return NextResponse.json({ error: "Ungültiger Code." }, { status: 401 });
  }

  await tenantDb.pendingLogin.delete({ where: { id: pending.id } });

  const expiresAt = computeSessionExpiry();
  const session = await tenantDb.session.create({ data: { userId: pending.user.id, expiresAt } });

  const response = NextResponse.json({ userId: pending.user.id }, { status: 200 });
  applySessionCookie(response, buildSessionCookie(session.id, expiresAt));
  return response;
}
