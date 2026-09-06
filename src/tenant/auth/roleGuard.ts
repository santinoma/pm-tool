export type RoleName = "owner" | "admin" | "member" | "client";

export interface UserRoleInfo {
  id: string;
  role: RoleName;
}

/**
 * Prüft, ob eine Rollenänderung den letzten Owner eines Tenants entfernen würde.
 * Ein Tenant ohne Owner darf nie entstehen (siehe Design/specs/SPEC-identity-org.md Boundaries).
 */
export function wouldRemoveLastOwner(
  users: UserRoleInfo[],
  targetUserId: string,
  newRole: RoleName,
): boolean {
  if (newRole === "owner") {
    return false;
  }
  const target = users.find((user) => user.id === targetUserId);
  if (!target || target.role !== "owner") {
    return false;
  }
  const remainingOwners = users.filter(
    (user) => user.role === "owner" && user.id !== targetUserId,
  );
  return remainingOwners.length === 0;
}

export function canManageMembers(role: RoleName): boolean {
  return role === "owner" || role === "admin";
}

export interface UserActiveRoleInfo extends UserRoleInfo {
  isActive: boolean;
}

/**
 * Prüft, ob eine Deaktivierung den letzten aktiven Owner eines Tenants entfernen würde.
 * Bereits inaktive Owner zählen nicht als "verbleibend" — es muss immer mindestens ein
 * aktiver Owner übrig bleiben, der sich noch einloggen kann.
 */
export function wouldDeactivateLastOwner(
  users: UserActiveRoleInfo[],
  targetUserId: string,
): boolean {
  const target = users.find((user) => user.id === targetUserId);
  if (!target || target.role !== "owner") {
    return false;
  }
  const remainingActiveOwners = users.filter(
    (user) => user.role === "owner" && user.isActive && user.id !== targetUserId,
  );
  return remainingActiveOwners.length === 0;
}
