import type { PrismaClient } from "@/generated/tenant-client/client.js";
import { PERMISSION_KEYS, type PermissionKey } from "./permissionCatalog";
import type { RoleName } from "../auth/roleGuard";

/**
 * T402 (Productive "Default Permission Sets: Employees, Clients, and
 * Contractors" — Artikel 16917656): die acht Standard-Berechtigungsprofile,
 * die JEDER Productive-Organisation zur Verfügung stehen (nicht wie echte
 * Custom Roles ans Ultimate-Plan/`custom_roles`-Feature gebunden). Ersetzen
 * faktisch die bisherige hartkodierte Owner/Admin/Member/Client-Vierteilung
 * als sichtbares, zuweisbares Konzept — das `Role`-Enum bleibt als
 * Sitzplatz-Typ (Employee/Client, bezahlt/kostenlos) und "genau ein Owner"-
 * Invariante bestehen, siehe `roadmap/PHASE4-tasks.md` T402 für die
 * Begründung, warum ein vollständiges Entfernen des Enums hier bewusst
 * NICHT gemacht wurde.
 *
 * Mapping auf den bestehenden `PERMISSION_KEYS`-Katalog: mehrere von
 * Productives dokumentierten Nuancen lassen sich mit den aktuellen 14 Keys
 * nicht exakt abbilden (siehe Kommentare unten je Set) — in jedem
 * Zweifelsfall wurde die KONSERVATIVERE Auslegung gewählt (lieber ein Recht
 * fehlt, als dass zu viel gewährt wird). Dokumentiert als bekannte Lücken in
 * `roadmap/PHASE4-tasks.md` T403.
 */
export const ADMIN_SET_NAME = "Admin";
export const MANAGER_SET_NAME = "Manager";
export const PROFITABILITY_MANAGER_SET_NAME = "Profitability Manager";
export const COORDINATOR_SET_NAME = "Coordinator";
export const STAFF_SET_NAME = "Staff";
export const CONTRACTOR_SET_NAME = "Contractor";
export const CLIENT_COLLABORATOR_SET_NAME = "Client Collaborator";
export const CLIENT_LEAD_SET_NAME = "Client Lead";

interface SystemPermissionSetDef {
  name: string;
  /** Für welche Basis-Rollen dieses Set als Standard-Zuordnung gilt (Migration bestehender Nutzer, siehe getDefaultSystemSetNameForRole). */
  legacyRoleMapping: RoleName[];
  permissions: PermissionKey[];
}

const MANAGER_PERMISSIONS: PermissionKey[] = [
  "projects_manage",
  "tasks_manage_all",
  "budgets_manage",
  "invoicing_manage",
  "workflows_manage",
  "automations_manage",
  "portfolios_manage",
  "members_invite",
];

export const SYSTEM_PERMISSION_SETS: SystemPermissionSetDef[] = [
  {
    name: ADMIN_SET_NAME,
    legacyRoleMapping: ["owner", "admin"],
    // "Admins can manage everything, including cost rates and general
    // organization-level settings." — alle Keys.
    permissions: [...PERMISSION_KEYS],
  },
  {
    name: MANAGER_SET_NAME,
    legacyRoleMapping: [],
    // "Managers can oversee and manage projects, budgets, and deals ...
    // excluding cost and profit. They don't have access to cost rates and
    // organization-level settings." — bewusst OHNE cost_rates_manage,
    // financial_month_closing_manage, organization_settings_manage,
    // employee_fields_sensitive_view, integrations_manage. OHNE
    // members_manage_roles (siehe T403: Manager darf laut Doku nur
    // niedrigere Stufen befördern, nicht global Rollen ändern — mit dem
    // aktuell binären Key würde das zu viel gewähren).
    permissions: MANAGER_PERMISSIONS,
  },
  {
    name: PROFITABILITY_MANAGER_SET_NAME,
    legacyRoleMapping: [],
    // "In addition to all the information a manager can see, the
    // Profitability Manager also has access to the budget's profit and
    // revenue information ... can't access users' cost rates and
    // organization-level settings." — Manager-Rechte + cost_rates_manage
    // (in dieser Codebase deckt dieser Key bereits sowohl Kostensätze als
    // auch Profitabilitäts-Einsicht ab, siehe T302/T304-Historie). OHNE
    // financial_month_closing_manage (laut T312-Recherche Admin-only).
    permissions: [...MANAGER_PERMISSIONS, "cost_rates_manage"],
  },
  {
    name: COORDINATOR_SET_NAME,
    legacyRoleMapping: [],
    // "Full project access besides project financials ... does not have
    // permission to add, edit, and delete projects on their own." — NUR
    // tasks_manage_all. Bewusst OHNE projects_manage (Coordinator darf laut
    // Doku keine Projekte anlegen/bearbeiten/löschen) und ohne
    // workflows_manage/automations_manage, da diese aktuell hart von
    // projects_manage abhängen (PERMISSION_DEPENDENCIES) — siehe T403.
    permissions: ["tasks_manage_all"],
  },
  {
    name: STAFF_SET_NAME,
    legacyRoleMapping: ["member"],
    // "Staff members can't access company settings, financial information,
    // or cost rates ... access to all projects they are a part of" — keine
    // granularen Keys, identisch zum bisherigen Legacy-Fallback für `member`.
    permissions: [],
  },
  {
    name: CONTRACTOR_SET_NAME,
    legacyRoleMapping: [],
    // "Contractors have one default permission set ... Access is granted
    // through explicit membership only." Keine der bestehenden
    // Organisations-Keys treffen zu — Contractor-Zugriff wird bereits über
    // `employmentType` (T315) + explizite Projekt-/Budget-Mitgliedschaft
    // gesteuert, nicht über PERMISSION_KEYS.
    permissions: [],
  },
  {
    name: CLIENT_COLLABORATOR_SET_NAME,
    legacyRoleMapping: ["client"],
    // "Manage Tasks and Task Lists ... Collaborate on Projects" — identisch
    // zum bisherigen Legacy-Fallback für `client`.
    permissions: [],
  },
  {
    name: CLIENT_LEAD_SET_NAME,
    legacyRoleMapping: [],
    // "Additionally, clients can gain access to budgets and timesheets if
    // you grant them the Client Lead permission set ... specific to a
    // particular client." Der zusätzliche Budget-/Timesheet-Zugriff läuft
    // weiterhin über den bestehenden per-Budget "Client Access"-Schalter
    // (ProjectClientAccess), nicht über einen neuen PERMISSION_KEYS-Eintrag.
    permissions: [],
  },
];

/**
 * Legt die acht Standard-Permission-Sets an, falls sie für diesen Tenant
 * noch nicht existieren (Self-Healing-Muster wie `getOrCreateSystemTaskFields`
 * aus T223 — kein separater Backfill-Migrationsschritt nötig, rein
 * Datenzeilen, idempotent über den `@@unique([name])`-Constraint).
 */
export async function getOrCreateSystemPermissionSets(tenantDb: PrismaClient): Promise<void> {
  const existing = await tenantDb.customRole.findMany({
    where: { isSystem: true },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((role) => role.name));
  const missing = SYSTEM_PERMISSION_SETS.filter((set) => !existingNames.has(set.name));
  if (missing.length === 0) return;

  await tenantDb.customRole.createMany({
    data: missing.map((set) => ({ name: set.name, permissions: set.permissions, isSystem: true })),
    skipDuplicates: true,
  });
}

/**
 * Standard-Zuordnung für einen Nutzer ohne explizit gesetztes `customRoleId`
 * — bildet die bisherige Legacy-Rollen-Logik (owner/admin → alles, member/
 * client → nichts) 1:1 auf das passende System-Set ab, damit bestehende
 * Nutzer ohne harten Daten-Migrationsschritt korrekt in die neuen,
 * benannten Sets fallen.
 */
export function getDefaultSystemSetNameForRole(role: RoleName): string {
  const match = SYSTEM_PERMISSION_SETS.find((set) => set.legacyRoleMapping.includes(role));
  return match?.name ?? STAFF_SET_NAME;
}
