# Task List: project-creation-wizard

Siehe `SPEC-project-creation-wizard.md`.

## Phase 1: Datenmodell
- [x] Task 1: `Project` erweitert (type, color, clientId, projectManagerId, isTemplate, enabledModules)
- [x] Task 2: `Client`-Modell
- [x] Task 3: `ProjectMember`-Modell
- [x] Task 4: Migration

## Phase 2: Reine Logik
- [x] Task 5: `resolveProjectMembership.ts` (8 Tests) + `assertProjectAccess.ts`
- [x] Task 6: `cloneProjectTemplate.ts` (2 Tests), `moduleCatalog.ts` (3 Tests), `colorPalette.ts`

## Phase 3: Durchsetzung (größter Block)
- [x] Task 7: Ressourcen-Resolver (Task/Comment/Attachment/Budget/Section/Invoice/Cycle/Baseline/Wiki/SharedView)
- [x] Task 8: Guards in allen betroffenen API-Routen ergänzt — siehe Liste unten
- [x] Task 9: Suche (`/api/tenant/search`, `/api/tenant/tasks/search`) auf Mitgliedschaft gefiltert; `/api/tenant/reports/overdue`, `/api/tenant/reports/progress` ebenfalls
- [x] Task 10: `extractProjectScopedId()` in `proxy.ts` deckt zentral alle `/projects/[id]/*`-Seiten und `/api/tenant/projects/[id]/*`-API-Routen ab (4 Tests)

## Phase 4: API (neue Ressourcen)
- [x] Task 11: Client-CRUD
- [x] Task 12: Projekt-Mitglieder-CRUD
- [x] Task 13: Template-Markierung + Klon-Route (via `POST /api/tenant/projects` mit `templateProjectId`)
- [x] Task 14: `POST /api/tenant/projects` auf Wizard-Payload erweitert (type/color/client/manager/module/members), Ersteller wird immer automatisch Mitglied (kein Self-Lockout)

## Phase 5: UI
- [x] Task 15: Mehrstufiger Wizard (5 Schritte: Typ → Vorlage → Details → Module → Mitglieder)
- [x] Task 16: Settings: Client-Verzeichnis (`/settings/organization/clients`)
- [x] Task 17: Projekt-Einstellungen: Vorlagen-Markierung + Mitglieder-Verwaltung (`ProjectTeamPanel` auf der Workflow-Settings-Seite)

## Checkpoint: Abschluss
- [x] Success-Criteria verifiziert, Tests+Build grün (434/434), Docker-Verifikation, Review

### Vollständige Liste der auf Projekt-Mitgliedschaft geprüften Routen
Zentral über `proxy.ts` (`extractProjectScopedId`): alle `/projects/[id]/*`-Seiten
und `/api/tenant/projects/[id]/*`-API-Routen (Budget, Check-ins, Custom-Fields,
Status, Shared-Views, Transition-Rules, Wiki-Liste, Cycles-Liste,
Baselines-Liste, Activity, Notification-Preference, Role-Overrides, Members,
Mark-Template).

Einzeln ergänzt (verschachtelte Ressourcen ohne Projekt-ID in der URL):
`tasks` (GET/POST/PATCH + Liste), `tasks/[id]/comments`,
`tasks/[id]/attachments` (+Download), `tasks/[id]/custom-fields/[fieldId]`,
`tasks/[id]/dependencies`, `tasks/[id]/links` (+`[linkId]`),
`tasks/[id]/projects`, `tasks/search`, `budgets` (GET/POST),
`budgets/[id]`, `budgets/[id]/sections`, `budgets/[id]/invoices`,
`budget-sections/[id]`, `invoices/[id]`, `cycles/[id]`, `baselines/[id]`,
`wiki/[id]`, `shared-views/[id]`, `time-entries` (POST + gefiltertes GET),
`search`, `reports/overdue`, `reports/progress`, `/projects`-Liste.

### Docker-E2E-Verifikation (2026-08-26)
- Enterprise-Tenant, Client "Acme GmbH", zwei Mitglieder eingeladen (A, B).
- Projekt über den vollen Wizard-Payload angelegt (type=client, Farbe, Client,
  Projektleiter, Module `wiki/budgets/time` + immer `tasks`, `memberUserIds=[A]`)
  → Ersteller (Owner) UND A sind automatisch Mitglieder.
- **Mitglied A** (Projekt-Mitglied): `/projects/[id]/list` → 200,
  `/api/tenant/projects/[id]/statuses` → 200, Task erstellen/lesen → 200,
  Suche findet den Task, Kommentar erstellen erlaubt.
- **Mitglied B** (kein Projekt-Mitglied): `/projects/[id]/list` → 404,
  `/api/tenant/projects/[id]/statuses` → 403, Task erstellen/lesen → 403,
  Kommentar erstellen → 403, Budget-Sections lesen → 403, Suche findet
  nichts, `/api/tenant/projects`-Liste zeigt das Projekt nicht.
- **Owner** (nicht explizit Mitglied, aber owner-Rolle): uneingeschränkter
  Zugriff überall (Bypass funktioniert).
- Projekt als Vorlage markiert → `POST /api/tenant/projects` mit
  `templateProjectId` klont die drei Status korrekt in ein neues Projekt.
- Mitglied B nachträglich per `POST .../members` hinzugefügt → hat
  danach sofort Zugriff (200) ohne erneuten Login.
- `/projects/new` (Wizard), `/settings/organization/clients`,
  `/projects/[id]/settings/workflow` (Team-Panel) rendern je 200.

### Bewusste Scope-Grenzen (dokumentiert)
- **"Meine Tasks"**: Ein zugewiesener Task bleibt sichtbar, auch wenn der
  Nutzer kein formales Projekt-Mitglied ist — Zuweisung gilt als impliziter
  Zugriffsgrant (Standardverhalten in PM-Tools, vermeidet verwirrende UX).
- **`time-entries/[id]`** (PATCH/DELETE eigener Einträge): bleibt beim bereits
  bestehenden Eigentümer-Check (Ersteller oder Owner/Admin) — zusätzliche
  Projekt-Mitgliedschaftsprüfung hätte Nutzern das Bearbeiten eigener,
  historischer Zeiteinträge nach Entfernen aus einem Projekt verwehrt, ohne
  Sicherheitsgewinn.
- **Platzhalter-Module** (Forms, Meetings, Deals, Expenses, Dashboard,
  Resource Planning, Reports, Purchase Orders): nur deaktivierte Einträge im
  Wizard, keine Funktion — bewusst für spätere Versionen zurückgestellt.
