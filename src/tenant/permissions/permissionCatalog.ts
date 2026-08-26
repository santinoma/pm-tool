export const PERMISSION_KEYS = [
  "members_invite",
  "members_manage_roles",
  "organization_settings_manage",
  "projects_manage",
  "tasks_manage_all",
  "budgets_manage",
  "automations_manage",
  "workflows_manage",
  "integrations_manage",
  "portfolios_manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_GROUPS: { label: string; keys: PermissionKey[] }[] = [
  { label: "Team", keys: ["members_invite", "members_manage_roles"] },
  { label: "Projekte", keys: ["projects_manage", "tasks_manage_all"] },
  { label: "Financials", keys: ["budgets_manage"] },
  { label: "Automatisierung", keys: ["automations_manage", "workflows_manage", "integrations_manage"] },
  { label: "Organisation", keys: ["organization_settings_manage", "portfolios_manage"] },
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  members_invite: "Mitglieder einladen",
  members_manage_roles: "Rollen von Mitgliedern ändern",
  organization_settings_manage: "Organisationseinstellungen verwalten",
  projects_manage: "Projekte anlegen/bearbeiten",
  tasks_manage_all: "Alle Tasks bearbeiten (nicht nur eigene)",
  budgets_manage: "Budgets & Financials verwalten",
  automations_manage: "Automations verwalten",
  workflows_manage: "Workflow-Übergangsregeln verwalten",
  integrations_manage: "Integrationen & API-Keys verwalten",
  portfolios_manage: "Portfolios & Goals verwalten",
};

export type BaseRoleName = "owner" | "admin" | "member" | "client";

/**
 * Ohne zugewiesene Custom Role (oder ohne gebuchtes Feature) gilt exakt das
 * heutige Verhalten: owner/admin dürfen alles, member/client nichts von den
 * neuen granularen Rechten — bestehende `canManageMembers()`-Stellen bleiben
 * dadurch unverändert korrekt, auch wenn sie (noch) nicht migriert sind.
 */
export const LEGACY_ROLE_PERMISSIONS: Record<BaseRoleName, PermissionKey[]> = {
  owner: [...PERMISSION_KEYS],
  admin: [...PERMISSION_KEYS],
  member: [],
  client: [],
};

function sanitizePermissions(permissions: string[]): PermissionKey[] {
  const known = new Set<string>(PERMISSION_KEYS);
  return permissions.filter((key): key is PermissionKey => known.has(key));
}

/**
 * Ermittelt die effektiven Berechtigungen. Vorrang (höchste zuerst):
 * 1. Projekt-Rollen-Override (nur wenn `project_role_overrides` gebucht ist)
 * 2. Tenant-weite Custom Role (nur wenn `custom_roles` gebucht ist)
 * 3. Legacy-Fallback aus der Basis-Rolle
 */
export function computeEffectivePermissions(params: {
  baseRole: BaseRoleName;
  customRolePermissions?: string[] | null;
  projectOverridePermissions?: string[] | null;
  hasCustomRolesFeature: boolean;
  hasProjectOverridesFeature: boolean;
}): Set<PermissionKey> {
  const {
    baseRole,
    customRolePermissions,
    projectOverridePermissions,
    hasCustomRolesFeature,
    hasProjectOverridesFeature,
  } = params;

  if (hasProjectOverridesFeature && projectOverridePermissions) {
    return new Set(sanitizePermissions(projectOverridePermissions));
  }
  if (hasCustomRolesFeature && customRolePermissions) {
    return new Set(sanitizePermissions(customRolePermissions));
  }
  return new Set(LEGACY_ROLE_PERMISSIONS[baseRole]);
}

export function hasPermission(effective: Set<PermissionKey>, key: PermissionKey): boolean {
  return effective.has(key);
}
