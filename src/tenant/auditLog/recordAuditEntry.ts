import type { PrismaClient } from "../../generated/tenant-client/client.js";

export interface RecordAuditEntryInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
}

/**
 * Schreibt einen Eintrag in den org-weiten Security-/Compliance-Audit-Log
 * (`AuditLogEntry`). Bewusst getrennt vom `ActivityEvent`-System
 * (`recordActivity.ts`): `ActivityEvent` ist projekt-/task-bezogen und für
 * Benachrichtigungen an Nutzer gedacht, `AuditLogEntry` ist org-weit und
 * ausschließlich für sicherheitsrelevante Aktionen (Rollenänderungen,
 * API-Keys, SSO-Konfiguration, ...) — kein Ersatz füreinander, nicht
 * vereinheitlichen.
 */
export async function recordAuditEntry(
  tenantDb: PrismaClient,
  input: RecordAuditEntryInput,
): Promise<void> {
  await tenantDb.auditLogEntry.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
    },
  });
}
