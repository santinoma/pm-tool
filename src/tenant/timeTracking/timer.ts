import type { PrismaClient, TimeEntry } from "../../generated/tenant-client/client.js";
import { computeDurationMinutes } from "./duration";

/**
 * Stoppt den aktuell laufenden Timer (falls vorhanden) des angegebenen Nutzers.
 * Wird von "neuer Timer startet" und "Timer explizit stoppen" gemeinsam genutzt,
 * damit die Stop-Berechnung nur an einer Stelle existiert.
 */
export async function stopRunningTimer(
  tenantDb: PrismaClient,
  userId: string,
  now: Date = new Date(),
): Promise<TimeEntry | null> {
  const running = await tenantDb.timeEntry.findFirst({
    where: { userId, startedAt: { not: null }, endedAt: null },
  });
  if (!running || !running.startedAt) {
    return null;
  }

  return tenantDb.timeEntry.update({
    where: { id: running.id },
    data: { endedAt: now, durationMinutes: computeDurationMinutes(running.startedAt, now) },
  });
}
