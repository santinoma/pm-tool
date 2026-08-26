import type { PrismaClient, TenantSettings } from "../../generated/tenant-client/client.js";

export async function getOrCreateTenantSettings(tenantDb: PrismaClient): Promise<TenantSettings> {
  const existing = await tenantDb.tenantSettings.findFirst();
  if (existing) {
    return existing;
  }
  return tenantDb.tenantSettings.create({ data: {} });
}
