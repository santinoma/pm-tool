import type { PrismaClient } from "@/generated/tenant-client/client.js";
import type { RoleName } from "@/tenant/auth/roleGuard";

/** owner/admin/member sind bezahlte Sitzplätze — die client-Rolle (Portal-Zugang) ist kostenlos. */
export const PAID_SEAT_ROLES: RoleName[] = ["owner", "admin", "member"];

/**
 * Zählt belegte bezahlte Sitzplätze: aktive Nutzer mit einer bezahlten Rolle plus
 * noch nicht angenommene, nicht abgelaufene Einladungen auf eine bezahlte Rolle
 * (reserviert bereits einen Platz, bevor die Einladung angenommen wird).
 */
export async function countPaidSeats(tenantDb: PrismaClient): Promise<number> {
  const [activeUsers, pendingInvites] = await Promise.all([
    tenantDb.user.count({ where: { role: { in: PAID_SEAT_ROLES }, isActive: true } }),
    tenantDb.invite.count({
      where: { role: { in: PAID_SEAT_ROLES }, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
  ]);
  return activeUsers + pendingInvites;
}
