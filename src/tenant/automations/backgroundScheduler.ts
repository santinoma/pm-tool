import { listTenants } from "@/platform/tenantRegistry";
import { getTenantDbClient } from "@/tenant/tenantDb";
import { runDueTimeAutomationRules } from "./scheduleDueCheck";

/**
 * T307: the actual periodic tick behind the background scheduler
 * (`instrumentation.ts` calls this on an interval). Iterates every active
 * tenant and runs its due time_daily/time_weekly automation rules — the
 * same `runDueTimeAutomationRules` that the automations settings page also
 * calls as a pull-based safety net, so the two never double-fire (guarded
 * by each rule's `lastRunPeriodKey`).
 *
 * One tenant's failure (bad data, a broken rule) must not stop the sweep
 * for every other tenant, so each is isolated in its own try/catch.
 */
export async function runDueAutomationsForAllTenants(now: Date = new Date()): Promise<void> {
  const tenants = await listTenants();
  for (const tenant of tenants) {
    if (tenant.status !== "active") continue;
    try {
      const tenantDb = getTenantDbClient(tenant.dbUrl);
      await runDueTimeAutomationRules(tenantDb, now);
    } catch (error) {
      console.warn(`[automations] Hintergrund-Scheduler für Tenant ${tenant.id} fehlgeschlagen, übersprungen:`, error);
    }
  }
}
