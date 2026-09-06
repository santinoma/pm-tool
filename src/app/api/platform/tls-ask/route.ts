import { NextResponse } from "next/server";
import { extractSubdomain } from "@/tenant/resolveTenant";
import { getTenantBySubdomain } from "@/platform/tenantRegistry";

/**
 * Backing endpoint for Caddy's `on_demand_tls` (see Caddyfile.prod). Caddy calls this with
 * `?domain=<hostname>` before issuing a certificate for a hostname it hasn't seen before, and
 * only proceeds on a 2xx response — this is what keeps the on-demand issuer from burning ACME
 * rate limits (or being used as a free cert oracle) for arbitrary hostnames someone points at
 * the server's IP. Allowed: the bare base domain, `admin.<base>`, and any subdomain of an
 * active tenant.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const domain = url.searchParams.get("domain")?.toLowerCase() ?? "";
  const baseDomain = (process.env.BASE_DOMAIN ?? "").toLowerCase();

  if (!domain || !baseDomain) {
    return new NextResponse("forbidden", { status: 403 });
  }
  if (domain === baseDomain || domain === `admin.${baseDomain}`) {
    return NextResponse.json({ ok: true });
  }

  const subdomain = extractSubdomain(domain);
  if (!subdomain) {
    return new NextResponse("forbidden", { status: 403 });
  }
  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant || tenant.status !== "active") {
    return new NextResponse("forbidden", { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
