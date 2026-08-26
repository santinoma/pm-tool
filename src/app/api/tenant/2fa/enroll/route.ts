import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { buildOtpAuthUri, generateTotpSecret } from "@/tenant/auth/totp";

export async function POST() {
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const secret = generateTotpSecret();
  await context.tenantDb.user.update({
    where: { id: context.currentUser.id },
    data: { totpSecret: secret, totpEnabled: false },
  });

  const otpauthUri = buildOtpAuthUri(secret, context.currentUser.email, "PM-Atlas");
  return NextResponse.json({ secret, otpauthUri });
}
