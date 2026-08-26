import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTenantContext } from "@/tenant/context";
import { SESSION_COOKIE_NAME, buildExpiredSessionCookie } from "@/tenant/auth/session";
import { applySessionCookie } from "@/tenant/auth/applySessionCookie";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    const context = await getTenantContext();
    await context?.tenantDb.session.delete({ where: { id: sessionId } }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  applySessionCookie(response, buildExpiredSessionCookie());
  return response;
}
