# Task List: custom-roles-permissions

Siehe `SPEC-custom-roles-permissions.md`.

## Phase 1: Datenmodell
- [x] Task 1: `CustomRole`, `ProjectRoleOverride`, `User.customRoleId`, Migration
- [x] Task 2: neue Feature-Keys `custom_roles`/`project_role_overrides` in Plan-Map + Route-Gates

## Phase 2: Reine Logik
- [x] Task 3: `permissionCatalog.ts` (Katalog, Legacy-Fallback, `computeEffectivePermissions()`) + Tests (7 Tests)
- [x] Task 4: `resolvePermissions.ts` (DB-Wrapper)

## Phase 3: API
- [x] Task 5: Custom-Role-CRUD-Routen
- [x] Task 6: Zuweisungs-Route (`users/[id]/custom-role`)
- [x] Task 7: Projekt-Override-Routen (Enterprise)
- [x] Task 8: Repräsentative Migration bestehender Checks:
  - Mitglieder/Invites (`members_invite`, `members_manage_roles`)
  - Automations (`automations_manage`)
  - Budgets/Financials (`budgets_manage`): Budget-CRUD, Sections, Cost-Rate
  - Integrations-Marketplace (`integrations_manage`)
  - Workflow-Transition-Rules (`workflows_manage`, projekt-scoped)
  - Portfolios/Goals (`portfolios_manage`)
- [x] Task 9: Integrationstest (5 Tests)

## Phase 4: UI
- [x] Task 10: `/settings/organization/roles` — Rollen-Editor (Name + Berechtigungs-Checkboxen, gruppiert)
- [x] Task 11: Members-Seite — Custom-Role-Zuweisung (Spalte in Mitgliedertabelle) + Projekt-Override-Panel (Enterprise)

## Checkpoint: Abschluss
- [x] Success-Criteria verifiziert, Tests+Build grün, Docker-Verifikation, Review

### Docker-E2E-Verifikation (2026-08-26)
- Enterprise-Tenant: Custom Role "Finance Lead" (`budgets_manage`) angelegt,
  einem `member` zugewiesen.
- Vor Zuweisung: Budget-Erstellung → 403. Nach Zuweisung: → 201. Automations
  weiterhin → 403 (nur die gewährte Berechtigung wirkt, keine anderen).
- Projekt-Override: zweite Custom Role "Project Admin" (`workflows_manage`)
  einem Mitglied nur für Projekt "Beta" zugewiesen → Transition-Rule-Erstellung
  dort vorher 403, danach 201 — Override hat Vorrang vor der tenant-weiten
  Custom Role für dieses eine Projekt.
- Klein-Plan: `/settings/organization/roles` → 404, `/api/tenant/roles` → 403.
- Rollen-Löschung: Nutzer fällt danach korrekt auf Legacy-Verhalten (keine
  granularen Rechte) zurück, `ProjectRoleOverride`-Einträge werden mitgelöscht.
- `/settings/organization/roles` und `/members` rendern 200.

### Scope-Grenze (dokumentiert, wie zuvor bei integrations-marketplace)
Migriert wurden repräsentative, hochwertige Stellen (siehe Task 8). Die
verbleibenden ~40 bestehenden `canManageMembers()`-Aufrufe (z. B. Task-CRUD,
Wiki, Check-ins, Custom-Field-Verwaltung, Webhooks, Recycle-Bin) bleiben
bewusst auf dem Basis-Rollensystem — vollständige Migration liegt außerhalb
des Scopes dieser Anfrage und würde bei Bedarf als eigener Auftrag folgen.
Rückwärtskompatibilität ist dadurch garantiert: kein bestehendes Verhalten
ändert sich für Tenants ohne Custom Roles.
