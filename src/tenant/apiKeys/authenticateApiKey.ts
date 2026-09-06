import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getTenantBySubdomain } from "@/platform/tenantRegistry";
import { getTenantDbClient } from "@/tenant/tenantDb";
import { hashApiKeyToken } from "./apiKeyToken";
import { checkRateLimit } from "./rateLimit";
import type { ApiKeyScope, PrismaClient, User } from "@/generated/tenant-client/client.js";

export interface ApiKeyAuthContext {
  tenantDb: PrismaClient;
  user: User;
  scope: ApiKeyScope;
}

export type ApiKeyAuthResult =
  | ({ ok: true } & ApiKeyAuthContext)
  | { ok: false; status: 401 }
  | { ok: false; status: 429; retryAfterSeconds: number };

/**
 * Authenticates a request against `/api/v1/**` using the `Authorization:
 * Bearer <token>` header. Also enforces the per-key rate limit (see
 * `rateLimit.ts`) — a request that would exceed it is rejected here with a
 * 429 result rather than reaching the route handler.
 */
export async function authenticateApiKey(request: Request): Promise<ApiKeyAuthResult> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) return { ok: false, status: 401 };

  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain");
  const tenant = subdomain ? await getTenantBySubdomain(subdomain) : null;
  if (!tenant) return { ok: false, status: 401 };

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const apiKey = await tenantDb.apiKey.findUnique({
    where: { tokenHash: hashApiKeyToken(token) },
    include: { user: true },
  });
  if (!apiKey || apiKey.revokedAt !== null) return { ok: false, status: 401 };

  const rateLimit = checkRateLimit(apiKey.id);
  if (!rateLimit.allowed) {
    return { ok: false, status: 429, retryAfterSeconds: rateLimit.retryAfterSeconds ?? 10 };
  }

  await tenantDb.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  return { ok: true, tenantDb, user: apiKey.user, scope: apiKey.scope };
}

/** Builds the error response for a failed `authenticateApiKey` result (401 or 429). */
export function authFailureResponse(auth: { ok: false; status: 401 } | { ok: false; status: 429; retryAfterSeconds: number }) {
  if (auth.status === 429) {
    return NextResponse.json(
      { error: "Rate limit überschritten. Bitte später erneut versuchen." },
      { status: 429, headers: { "Retry-After": String(auth.retryAfterSeconds) } },
    );
  }
  return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
}

/** Rejects a mutating request made with a read-only API key. Returns `null` if the key may write. */
export function requireWriteScope(auth: ApiKeyAuthContext) {
  if (auth.scope === "read_only") {
    return NextResponse.json({ error: "Dieser API-Key ist nur lesend." }, { status: 403 });
  }
  return null;
}
