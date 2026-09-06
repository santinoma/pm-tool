import { canManageMembers } from "../auth/roleGuard";
import type { User } from "../../generated/tenant-client/client.js";

/**
 * Ein privater Task ist nur für Assignee, Subscriber und owner/admin
 * sichtbar. Wird als zusätzliche `AND`-Bedingung in Task-Listen-Queries
 * eingesetzt: `where: { AND: [bestehendeBedingungen, privateTaskVisibilityFilter(user)] }`.
 * Bewusste Grenze: nur auf den Haupt-Task-Übersichten angewendet (List,
 * Board, Calendar, Triage, Meine Tasks, Suche, Portal, geteilte Links) —
 * nicht auf Gantt/Hill-Chart/Cycles/Baselines/Resource-Planning/Dashboard/
 * Reports, wo private Tasks aktuell noch mit auftauchen können.
 */
export function privateTaskVisibilityFilter(user: User) {
  if (canManageMembers(user.role)) return {};
  return {
    OR: [{ isPrivate: false }, { assigneeId: user.id }, { subscribers: { some: { userId: user.id } } }],
  };
}

export function canViewPrivateTask(
  user: User,
  task: { isPrivate: boolean; assigneeId: string | null },
  isSubscriber: boolean,
): boolean {
  if (!task.isPrivate) return true;
  if (canManageMembers(user.role)) return true;
  if (task.assigneeId === user.id) return true;
  return isSubscriber;
}
