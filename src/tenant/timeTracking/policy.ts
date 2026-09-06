import type { PrismaClient, TimeTrackingPolicy } from "../../generated/tenant-client/client.js";

/**
 * `TimeTrackingPolicy` ist eine Singleton-Zeile pro Tenant-DB (kein Composite-Key) —
 * analog zu `TenantSettings`. Existiert noch keine Zeile, gelten die Defaults
 * (kein Tages-Limit, kein Wochenend-/Überschneidungs-Block).
 */
export async function getOrCreateTimeTrackingPolicy(tenantDb: PrismaClient): Promise<TimeTrackingPolicy> {
  const existing = await tenantDb.timeTrackingPolicy.findFirst();
  if (existing) {
    return existing;
  }
  return tenantDb.timeTrackingPolicy.create({ data: {} });
}
