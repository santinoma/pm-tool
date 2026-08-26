import { headers } from "next/headers";
import { getTenantBySubdomain } from "@/platform/tenantRegistry";
import { getTenantDbClient } from "@/tenant/tenantDb";
import { hashApiKeyToken } from "./apiKeyToken";
import type { PrismaClient, User } from "@/generated/tenant-client/client.js";

export interface ApiKeyAuthContext {
  tenantDb: PrismaClient;
  user: User;
}

export async function authenticateApiKey(request: Request): Promise<ApiKeyAuthContext | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) return null;

  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain");
  const tenant = subdomain ? await getTenantBySubdomain(subdomain) : null;
  if (!tenant) return null;

  const tenantDb = getTenantDbClient(tenant.dbUrl);
  const apiKey = await tenantDb.apiKey.findUnique({
    where: { tokenHash: hashApiKeyToken(token) },
    include: { user: true },
  });
  if (!apiKey || apiKey.revokedAt !== null) return null;

  await tenantDb.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  return { tenantDb, user: apiKey.user };
}
