import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTenantContext } from "@/tenant/context";
import { SESSION_COOKIE_NAME } from "@/tenant/auth/session";

export async function GET() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const cookieStore = await cookies();
  const currentSessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  const sessions = await context.tenantDb.session.findMany({
    where: { userId: context.currentUser.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      isCurrent: session.id === currentSessionId,
    })),
  });
}
