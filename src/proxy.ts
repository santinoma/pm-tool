import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractSubdomain } from "./tenant/resolveTenant";
import { getTenantBySubdomain } from "./platform/tenantRegistry";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const subdomain = extractSubdomain(host);

  if (!subdomain || subdomain === "admin") {
    // Admin-Domain oder nackte Basis-Domain: kein Tenant-Kontext nötig.
    return NextResponse.next();
  }

  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant || tenant.status !== "active") {
    return new NextResponse("Tenant not found", { status: 404 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenant.id);
  requestHeaders.set("x-tenant-subdomain", tenant.subdomain);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
