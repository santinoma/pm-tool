import type { PrismaClient } from "@/generated/tenant-client/client.js";
import { getOrCreateTenantSettings } from "@/tenant/timeTracking/tenantSettings";

/**
 * Financial Month Closing (T312, Productive Help Center "Financial Month
 * Closing: Closing and Securing Financial Periods"): sperrt Zeiteinträge,
 * Ausgaben und Services eines abgeschlossenen Kalendermonats organisationsweit
 * gegen Änderungen — unabhängig von `TimesheetLock` (personenbezogenes
 * Sperren einzelner Nutzer-Zeiträume).
 */

/** "YYYY-MM" im UTC-Kalender — Periodenschlüssel für Financial Month Closing. */
export function getPeriodKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parsePeriodKey(periodKey: string): { year: number; month: number } {
  const [year, month] = periodKey.split("-").map(Number);
  return { year, month: month - 1 };
}

/**
 * Zeitpunkt, ab dem `periodKey` laut Auto-Regel gesperrt gilt: der
 * `closingDay`-te Tag des Monats, der auf `periodKey` folgt (Productive-
 * Beispiel: Closing Date = 5 → ab dem 5. des Folgemonats gilt der Monat als
 * automatisch gesperrt).
 */
export function computeAutoLockThreshold(periodKey: string, closingDay: number): Date {
  const { year, month } = parsePeriodKey(periodKey);
  return new Date(Date.UTC(year, month + 1, closingDay));
}

export function isPeriodAutoLocked(periodKey: string, now: Date, enabled: boolean, closingDay: number): boolean {
  if (!enabled) return false;
  return now.getTime() >= computeAutoLockThreshold(periodKey, closingDay).getTime();
}

/**
 * Sperrstatus eines Monats: eine explizite `FinancialPeriodLock`-Übersteuerung
 * gewinnt immer; ohne Override entscheidet ausschließlich die Auto-Regel.
 */
export async function isPeriodLocked(tenantDb: PrismaClient, periodKey: string, now: Date = new Date()): Promise<boolean> {
  const override = await tenantDb.financialPeriodLock.findUnique({ where: { periodKey } });
  if (override) return override.locked;

  const settings = await getOrCreateTenantSettings(tenantDb);
  return isPeriodAutoLocked(periodKey, now, settings.financialMonthClosingEnabled, settings.financialMonthClosingDay);
}

export interface MonthOverviewRow {
  periodKey: string;
  locked: boolean;
  isOverride: boolean;
  lockedByLabel: string | null;
}

/**
 * "Month Overview" (Productive: Settings > Financial Month Closing): die
 * letzten 12 Kalendermonate inkl. aktuellem, jeweils mit Auto-Sperrstatus und
 * einer eventuell vorhandenen expliziten Übersteuerung. Von der Settings-
 * Seite (Server Component) und der Refresh-Route gemeinsam genutzt.
 */
export async function listRecentMonths(tenantDb: PrismaClient, now: Date = new Date()): Promise<MonthOverviewRow[]> {
  const settings = await getOrCreateTenantSettings(tenantDb);
  const periodKeys: string[] = [];
  for (let i = 0; i < 12; i++) {
    periodKeys.push(getPeriodKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }

  const overrides = await tenantDb.financialPeriodLock.findMany({
    where: { periodKey: { in: periodKeys } },
    include: { lockedBy: { select: { name: true, email: true } } },
  });
  const overrideByKey = new Map(overrides.map((override) => [override.periodKey, override]));

  return periodKeys.map((periodKey) => {
    const override = overrideByKey.get(periodKey);
    const autoLocked = isPeriodAutoLocked(periodKey, now, settings.financialMonthClosingEnabled, settings.financialMonthClosingDay);
    return {
      periodKey,
      locked: override ? override.locked : autoLocked,
      isOverride: Boolean(override),
      lockedByLabel: override?.lockedBy ? (override.lockedBy.name ?? override.lockedBy.email) : null,
    };
  });
}

/**
 * Prüft, ob `date` (Zeiteintrag/Ausgabe) in einem gesperrten Finanzmonat
 * liegt, und liefert bei Sperre die Productive-typische Fehlermeldung.
 */
export async function assertPeriodNotLocked(
  tenantDb: PrismaClient,
  date: Date,
  now: Date = new Date(),
): Promise<string | null> {
  const locked = await isPeriodLocked(tenantDb, getPeriodKey(date), now);
  if (!locked) return null;
  return "Financial month is closed. Please contact your organization Admin to unlock this month.";
}
