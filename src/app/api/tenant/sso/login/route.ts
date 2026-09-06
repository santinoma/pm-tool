import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getTenantBySubdomain } from "@/platform/tenantRegistry";
import { getTenantDbClient } from "@/tenant/tenantDb";
import { buildServiceProvider, buildIdentityProvider, resolveBaseDomain } from "@/tenant/sso/samlServiceProvider";

/**
 * SP-initiierter SSO-Login: unauthentifiziert per Definition, da genau hier
 * die Auth beginnt. Löst den Tenant über die Subdomain auf (wie andere
 * vorgelagerte, sessionlose Routen), baut den signierten AuthnRequest via
 * samlify und leitet zum SSO-Endpunkt des IdP weiter.
 */
export async function GET(request: Request) {
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

  const sp = buildServiceProvider(subdomain as string, resolveBaseDomain());
  const idp = buildIdentityProvider(ssoConfig);

  const { context: redirectUrl } = sp.createLoginRequest(idp, "redirect");
  return NextResponse.redirect(redirectUrl);
}
