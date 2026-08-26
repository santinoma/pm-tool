import { cookies, headers } from "next/headers";
import { getTenantBySubdomain } from "../platform/tenantRegistry";
import { getTenantDbClient } from "./tenantDb";
import { SESSION_COOKIE_NAME } from "./auth/session";
import { computeEntitledFeatures } from "./entitlements/features";
import type { FeatureKey } from "./entitlements/features";
import type { PrismaClient, User } from "../generated/tenant-client/client.js";

export interface TenantContext {
  tenantDb: PrismaClient;
  currentUser: User | null;
  entitledFeatures: Set<FeatureKey>;
}

/**
 * Reine Auflösungslogik, unabhängig von Next.js' `headers()`/`cookies()` — testbar mit
 * einfachen String-Argumenten. `getTenantContext()` ist der dünne Wrapper für echte Requests.
 */
export async function resolveTenantContext(
  subdomain: string | null,
  tenantId: string | null,
  sessionId: string | undefined,
): Promise<TenantContext | null> {
  if (!subdomain || !tenantId) {
    return null;
  }

  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant || tenant.id !== tenantId) {
    return null;
  }

  const tenantDb = getTenantDbClient(tenant.dbUrl);

  let currentUser: User | null = null;
  if (sessionId) {
    const session = await tenantDb.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (session && session.expiresAt.getTime() > Date.now()) {
      currentUser = session.user;
    }
  }

  const entitledFeatures = computeEntitledFeatures(tenant.plan, tenant.addOnFeatures);

  return { tenantDb, currentUser, entitledFeatures };
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const headerList = await headers();
  const cookieStore = await cookies();

  return resolveTenantContext(
    headerList.get("x-tenant-subdomain"),
    headerList.get("x-tenant-id"),
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  );
}
