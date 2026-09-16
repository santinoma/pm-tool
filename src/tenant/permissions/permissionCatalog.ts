export const PERMISSION_KEYS = [
  "members_invite",
  "members_manage_roles",
  "organization_settings_manage",
  "projects_manage",
  "tasks_manage_all",
  "budgets_manage",
  "invoicing_manage",
  "cost_rates_manage",
  "financial_month_closing_manage",
  "employee_fields_sensitive_view",
  "automations_manage",
  "workflows_manage",
  "integrations_manage",
  "portfolios_manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_GROUPS: { label: string; keys: PermissionKey[] }[] = [
  { label: "Team", keys: ["members_invite", "members_manage_roles", "employee_fields_sensitive_view"] },
  { label: "Projekte", keys: ["projects_manage", "tasks_manage_all"] },
  { label: "Financials", keys: ["budgets_manage", "invoicing_manage", "cost_rates_manage", "financial_month_closing_manage"] },
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
  invoicing_manage: "Rechnungen, Gutschriften & Zahlungen verwalten",
  cost_rates_manage: "Kostensätze & Profitabilität einsehen/verwalten (Profitability Manager)",
  financial_month_closing_manage: "Financial Month Closing verwalten (Monate sperren/entsperren)",
  employee_fields_sensitive_view: "Sensible Employee Fields einsehen",
  automations_manage: "Automations verwalten",
  workflows_manage: "Workflow-Übergangsregeln verwalten",
  integrations_manage: "Integrationen & API-Keys verwalten",
  portfolios_manage: "Portfolios & Goals verwalten",
};

/**
 * Kaskadierende Permission-Abhängigkeiten (Productive.io-Parität).
 *
 * Für jeden Key: die Menge anderer Keys, die als Voraussetzung gelten müssen,
 * damit der Key sinnvoll (und sicher) nutzbar ist. Begründung pro Eintrag:
 *
 * - members_manage_roles → members_invite: Wer Rollen von Mitgliedern ändern
 *   darf, muss die Mitgliederliste zuerst sehen/verwalten können (Einladen
 *   ist die niedrigstschwellige Team-Berechtigung).
 * - tasks_manage_all → projects_manage: Alle Tasks projektübergreifend zu
 *   bearbeiten setzt voraus, dass man grundsätzlich Projektzugriff/-verwaltung
 *   hat — sonst entsteht eine Berechtigung ohne den Kontext, in dem sie greift.
 * - budgets_manage → projects_manage: Budgets hängen an Projekten; ohne
 *   Projektverwaltung gibt es keinen sinnvollen Zugriffspfad auf Budgets.
 * - workflows_manage → projects_manage: Workflow-Übergangsregeln sind
 *   Projektkonfiguration.
 * - automations_manage → workflows_manage: Automations reagieren auf/lösen
 *   Workflow-Status-Übergänge aus — ohne Workflow-Rechte keine sinnvolle
 *   Automation-Verwaltung. (workflows_manage zieht transitiv projects_manage
 *   nach sich.)
 * - integrations_manage → organization_settings_manage: API-Keys/Integrationen
 *   sind organisationsweite Einstellungen.
 * - portfolios_manage → projects_manage: Portfolios bündeln Projekte; ohne
 *   Projektzugriff kein sinnvoller Portfolio-Überblick.
 * - invoicing_manage → budgets_manage: Rechnungen/Gutschriften/Zahlungen
 *   hängen an einem Budget — ohne Budget-Zugriff kein sinnvoller Kontext.
 * - cost_rates_manage → budgets_manage: Kostensätze/Profitabilität sind
 *   budgetbezogene Finanzdaten. Bewusst NICHT von `invoicing_manage`
 *   abhängig und umgekehrt — Productives Trennung von "Manager" (verwaltet
 *   Budgets/Rechnungen) und "Profitability Manager" (sieht Kostensätze/
 *   Margen) bildet sich genau dadurch ab, dass diese zwei Rechte
 *   unabhängig voneinander vergeben werden können, nicht dass eines das
 *   andere einschließt.
 * - employee_fields_sensitive_view → members_invite: sensible Employee
 *   Fields sind Mitgliederdaten — ohne die niedrigstschwellige Team-
 *   Berechtigung kein sinnvoller Zugriffspfad.
 * - financial_month_closing_manage → budgets_manage: Financial Month
 *   Closing sperrt/entsperrt Zeiteinträge, Ausgaben und Services, die alle
 *   an Budgets hängen — ohne Budget-Zugriff kein sinnvoller Kontext
 *   (Productive: systemseitiges Äquivalent ist die Admin-Berechtigung).
 *
 * `members_invite`, `projects_manage` und `organization_settings_manage`
 * selbst haben keine Voraussetzungen — sie sind die "Basis-Level" pro Gruppe.
 */
export const PERMISSION_DEPENDENCIES: Partial<Record<PermissionKey, PermissionKey[]>> = {
  members_manage_roles: ["members_invite"],
  tasks_manage_all: ["projects_manage"],
  budgets_manage: ["projects_manage"],
  invoicing_manage: ["budgets_manage"],
  cost_rates_manage: ["budgets_manage"],
  financial_month_closing_manage: ["budgets_manage"],
  employee_fields_sensitive_view: ["members_invite"],
  workflows_manage: ["projects_manage"],
  automations_manage: ["workflows_manage"],
  integrations_manage: ["organization_settings_manage"],
  portfolios_manage: ["projects_manage"],
};

/**
 * Löst eine explizit ausgewählte Permission-Menge zur vollständigen Menge auf,
 * inklusive aller transitiven Voraussetzungen (Auto-Enable). Rein funktional,
 * dedupliziert, Reihenfolge nicht garantiert.
 */
export function resolveWithDependencies(selected: PermissionKey[]): PermissionKey[] {
  const result = new Set<PermissionKey>();

  function visit(key: PermissionKey) {
    if (result.has(key)) return;
    result.add(key);
    const prerequisites = PERMISSION_DEPENDENCIES[key] ?? [];
    for (const prerequisite of prerequisites) {
      visit(prerequisite);
    }
  }

  for (const key of selected) {
    visit(key);
  }

  return Array.from(result);
}

/**
 * Ermittelt, welche der aktuell ausgewählten Permissions (direkt oder
 * transitiv) von `key` abhängen. Wird verwendet, um beim Deaktivieren von
 * `key` die davon abhängigen Permissions ebenfalls zu deaktivieren
 * (Cascade-and-inform statt Hard-Block).
 */
export function blockingDependents(key: PermissionKey, selected: PermissionKey[]): PermissionKey[] {
  const selectedSet = new Set(selected);
  const dependents = new Set<PermissionKey>();

  function dependsOn(candidate: PermissionKey, target: PermissionKey, seen = new Set<PermissionKey>()): boolean {
    if (seen.has(candidate)) return false;
    seen.add(candidate);
    const prerequisites = PERMISSION_DEPENDENCIES[candidate] ?? [];
    if (prerequisites.includes(target)) return true;
    return prerequisites.some((prerequisite) => dependsOn(prerequisite, target, seen));
  }

  for (const candidate of selectedSet) {
    if (candidate === key) continue;
    if (dependsOn(candidate, key)) {
      dependents.add(candidate);
    }
  }

  return Array.from(dependents);
}

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
