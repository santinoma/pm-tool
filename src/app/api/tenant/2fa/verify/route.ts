import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { verifyTotpCode } from "@/tenant/auth/totp";

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!context.currentUser.totpSecret) {
    return NextResponse.json({ error: "Kein 2FA-Setup gestartet." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.code !== "string") {
    return NextResponse.json({ error: "code ist erforderlich." }, { status: 400 });
  }

  if (!verifyTotpCode(context.currentUser.totpSecret, body.code)) {
    return NextResponse.json({ error: "Ungültiger Code." }, { status: 400 });
  }

  await context.tenantDb.user.update({
    where: { id: context.currentUser.id },
    data: { totpEnabled: true },
  });
  return NextResponse.json({ success: true });
}
