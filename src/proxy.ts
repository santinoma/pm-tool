import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractSubdomain } from "./tenant/resolveTenant";
import { getTenantBySubdomain } from "./platform/tenantRegistry";
import { getTenantDbClient } from "./tenant/tenantDb";
import { SESSION_COOKIE_NAME } from "./tenant/auth/session";
import { computeEntitledFeatures } from "./tenant/entitlements/features";
import { resolveMissingFeature } from "./tenant/entitlements/routeGates";
import { canManageMembers } from "./tenant/auth/roleGuard";

const CLIENT_ALLOWED_PREFIXES = [
  "/portal",
  "/login",
  "/accept-invite",
  "/shared",
  "/shared-doc",
  "/api/tenant/login",
  "/api/tenant/logout",
  "/api/tenant/invites",
  "/api/tenant/portal",
];

const TWO_FA_SETUP_ALLOWED_PREFIXES = [
  "/settings/security",
  "/login",
  "/api/tenant/login",
  "/api/tenant/logout",
  "/api/tenant/2fa",
];

function matchesAnyPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

const PROJECT_SCOPED_PAGE_PATTERN = /^\/projects\/([^/]+)(\/.*)?$/;
const PROJECT_SCOPED_API_PATTERN = /^\/api\/tenant\/projects\/([^/]+)(\/.*)?$/;

/**
 * Extrahiert die Projekt-ID aus Pfaden, die direkt einem Projekt zugeordnet
 * sind (`/projects/[id]/...`, `/api/tenant/projects/[id]/...`) — deckt damit
 * praktisch alle Projekt-Unterseiten und die dazugehörigen API-Routen mit
 * einer einzigen zentralen Prüfung ab. `/projects/new` ist explizit kein
 * Projekt-Pfad.
 */
export function extractProjectScopedId(pathname: string): string | null {
  if (pathname === "/projects/new" || pathname.startsWith("/projects/new/")) {
    return null;
  }
  const pageMatch = pathname.match(PROJECT_SCOPED_PAGE_PATTERN);
  if (pageMatch) return pageMatch[1];
  const apiMatch = pathname.match(PROJECT_SCOPED_API_PATTERN);
  if (apiMatch) return apiMatch[1];
  return null;
}

export function isAllowedForClient(pathname: string): boolean {
  return matchesAnyPrefix(pathname, CLIENT_ALLOWED_PREFIXES);
}

export function isAllowedDuring2faSetup(pathname: string): boolean {
  return matchesAnyPrefix(pathname, TWO_FA_SETUP_ALLOWED_PREFIXES);
}

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

  const pathname = request.nextUrl.pathname;
  const entitledFeatures = computeEntitledFeatures(tenant.plan, tenant.addOnFeatures);
  const missingFeature = resolveMissingFeature(pathname, entitledFeatures);
  if (missingFeature) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Dieses Feature ist im aktuellen Plan nicht enthalten." }, { status: 403 });
    }
    return new NextResponse("Not Found", { status: 404 });
  }

  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId && (!isAllowedForClient(pathname) || !isAllowedDuring2faSetup(pathname))) {
    const tenantDb = getTenantDbClient(tenant.dbUrl);
    const session = await tenantDb.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (session && session.expiresAt.getTime() > Date.now()) {
      if (session.user.role === "client" && !isAllowedForClient(pathname)) {
        return NextResponse.redirect(new URL("/portal", request.url));
      }
      if (session.user.role !== "client" && !session.user.totpEnabled && !isAllowedDuring2faSetup(pathname)) {
        const settings = await tenantDb.tenantSettings.findFirst();
        if (settings?.require2fa) {
          return NextResponse.redirect(new URL("/settings/security", request.url));
        }
      }
      if (session.user.role !== "client" && !canManageMembers(session.user.role)) {
        const projectId = extractProjectScopedId(pathname);
        if (projectId) {
          const membership = await tenantDb.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId: session.user.id } },
          });
          if (!membership) {
            if (pathname.startsWith("/api/")) {
              return NextResponse.json({ error: "Kein Zugriff auf dieses Projekt." }, { status: 403 });
            }
            return new NextResponse("Not Found", { status: 404 });
          }
        }
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenant.id);
  requestHeaders.set("x-tenant-subdomain", tenant.subdomain);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
