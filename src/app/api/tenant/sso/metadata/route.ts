import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getTenantBySubdomain } from "@/platform/tenantRegistry";
import { buildServiceProvider, resolveBaseDomain } from "@/tenant/sso/samlServiceProvider";

/**
 * Liefert die SP-Metadaten-XML des Tenants — unauthentifiziert, damit ein
 * Admin die URL direkt beim IdP hinterlegen kann (Standard-SAML-Workflow).
 */
export async function GET() {
  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain");
  const tenant = subdomain ? await getTenantBySubdomain(subdomain) : null;
  if (!tenant) {
    return new NextResponse("Tenant not found", { status: 404 });
  }

  const sp = buildServiceProvider(subdomain as string, resolveBaseDomain());
  return new NextResponse(sp.getMetadata(), {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}
