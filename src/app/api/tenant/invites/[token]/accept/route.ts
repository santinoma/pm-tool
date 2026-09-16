import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getTenantBySubdomain } from "@/platform/tenantRegistry";
import { getTenantDbClient } from "@/tenant/tenantDb";
import { hashPassword } from "@/tenant/auth/password";
import { isInviteValid } from "@/tenant/auth/invite";
import { buildSessionCookie, computeSessionExpiry } from "@/tenant/auth/session";
import { applySessionCookie } from "@/tenant/auth/applySessionCookie";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body.name !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Name und Passwort sind erforderlich." }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json(
      { error: "Passwort muss mindestens 8 Zeichen lang sein." },
      { status: 400 },
    );
  }

  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain");
  if (!subdomain) {
    return NextResponse.json({ error: "Unbekannter Tenant." }, { status: 404 });
  }

  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant) {
    return NextResponse.json({ error: "Unbekannter Tenant." }, { status: 404 });
  }

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const invite = await tenantDb.invite.findUnique({ where: { token } });
  if (!invite) {
    return NextResponse.json({ error: "Einladung nicht gefunden." }, { status: 404 });
  }

  const validation = isInviteValid(invite);
  if (!validation.valid) {
    const message =
      validation.reason === "expired"
        ? "Diese Einladung ist abgelaufen."
        : "Diese Einladung wurde bereits angenommen.";
    return NextResponse.json({ error: message }, { status: 410 });
  }

  const passwordHash = await hashPassword(body.password);

  const user = await tenantDb.user.upsert({
    where: { email: invite.email },
    create: { email: invite.email, name: body.name, passwordHash, role: invite.role, employmentType: invite.employmentType },
    update: { name: body.name, passwordHash, role: invite.role, employmentType: invite.employmentType },
  });

  await tenantDb.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

  if (invite.role === "client" && invite.grantedProjectIds.length > 0) {
    await tenantDb.projectClientAccess.createMany({
      data: invite.grantedProjectIds.map((projectId) => ({ projectId, userId: user.id })),
      skipDuplicates: true,
    });
  }

  const expiresAt = computeSessionExpiry();
  const session = await tenantDb.session.create({
    data: {
      userId: user.id,
      expiresAt,
      userAgent: headerList.get("user-agent"),
      lastSeenAt: new Date(),
    },
  });

  const response = NextResponse.json({ userId: user.id }, { status: 200 });
  applySessionCookie(response, buildSessionCookie(session.id, expiresAt));
  return response;
}
