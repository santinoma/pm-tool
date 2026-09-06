import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getTenantBySubdomain } from "@/platform/tenantRegistry";
import { getTenantDbClient } from "@/tenant/tenantDb";
import { buildServiceProvider, buildIdentityProvider, resolveBaseDomain } from "@/tenant/sso/samlServiceProvider";
import { extractSsoEmail } from "@/tenant/sso/extractSsoEmail";
import { isEligibleForSso } from "@/tenant/sso/ssoEligibility";
import { buildSessionCookie, computeSessionExpiry } from "@/tenant/auth/session";
import { applySessionCookie } from "@/tenant/auth/applySessionCookie";

/**
 * Assertion Consumer Service: der eigentliche Auth-Einstiegspunkt für SSO,
 * daher zwangsläufig unauthentifiziert. Die gesamte Sicherheit dieses
 * Endpunkts hängt an `sp.parseLoginResponse(...)` weiter unten — samlify
 * validiert dort die XML-Signatur der eingehenden SAML-Response gegen das in
 * `SsoConfig.cert` hinterlegte Zertifikat des IdP (siehe `flow.ts`:
 * `checkSignature` ist standardmäßig `true` und wird hier nicht
 * überschrieben). Diese Prüfung wird an keiner Stelle umgangen oder
 * abgeschwächt.
 */
export async function POST(request: Request) {
  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain");
  const tenant = subdomain ? await getTenantBySubdomain(subdomain) : null;
  if (!tenant) {
    return new NextResponse("Tenant not found", { status: 404 });
  }

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const ssoConfig = await tenantDb.ssoConfig.findFirst({ where: { enabled: true } });
  if (!ssoConfig) {
    return NextResponse.redirect(new URL("/login?error=sso_not_configured", request.url));
  }

  const formData = await request.formData().catch(() => null);
  const samlResponse = formData?.get("SAMLResponse");
  if (!formData || typeof samlResponse !== "string") {
    return NextResponse.redirect(new URL("/login?error=sso_invalid_response", request.url));
  }

  const sp = buildServiceProvider(subdomain as string, resolveBaseDomain());
  const idp = buildIdentityProvider(ssoConfig);

  let extract: { nameID?: string; attributes?: Record<string, string | string[]> };
  try {
    const result = await sp.parseLoginResponse(idp, "post", {
      body: { SAMLResponse: samlResponse },
    });
    extract = result.extract;
  } catch {
    // Signaturprüfung oder Struktur der Assertion fehlgeschlagen — niemals
    // einloggen, wenn samlify die Response nicht verifizieren konnte.
    return NextResponse.redirect(new URL("/login?error=sso_invalid_response", request.url));
  }

  const email = extractSsoEmail(extract);
  if (!email) {
    return NextResponse.redirect(new URL("/login?error=sso_invalid_response", request.url));
  }

  const user = await tenantDb.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return NextResponse.redirect(new URL("/login?error=sso_no_account", request.url));
  }

  if (!isEligibleForSso(user)) {
    return NextResponse.redirect(new URL("/login?error=sso_not_for_clients", request.url));
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

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  applySessionCookie(response, buildSessionCookie(session.id, expiresAt));
  return response;
}
