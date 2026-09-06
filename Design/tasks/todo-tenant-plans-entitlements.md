# Task List: tenant-plans-entitlements

Siehe `SPEC-tenant-plans-entitlements.md`.

## Phase 1: Datenmodell
- [x] Task 1: `TenantPlan`-Enum, `Tenant.plan`, `Tenant.addOnFeatures`, `TenantStatus.disabled`, Migration

## Phase 2: Reine Logik
- [x] Task 2: `computeEntitledFeatures()`/`hasFeature()` + Tests
- [x] Task 3: `resolveMissingFeature()` (Pfad-Matching) + Tests

## Phase 3: Durchsetzung
- [x] Task 4: `proxy.ts` erweitert (Feature-Gates für Pages/API, 403 vs. 404)
- [x] Task 5: `TenantContext.entitledFeatures`
- [x] Task 6: Invite-Route (`client`-Rolle) + `tenant-settings` (`require2fa`) — feldspezifische Gates, da diese Routen auch Kernfelder bedienen

## Phase 4: UI
- [x] Task 7: `AppShell`/`ProjectSubnav`/Settings-Hub filtern nicht enthaltene Module aus
- [x] Task 8: Tenant-Anlage: Plan-Auswahl + 2FA-Add-on-Checkbox, dediziert nur bei Enterprise
- [x] Task 9: Tenant-Liste: Plan-Badge, Aktivieren/Deaktivieren-Button

## Phase 5: API (Platform)
- [x] Task 10: `POST /api/tenants` — Plan/Add-ons annehmen, `dedicated` nur bei Enterprise
- [x] Task 11: `PATCH /api/tenants/[id]` — Status-Toggle (aktiv/deaktiviert)

## Checkpoint: Abschluss
- [x] Success-Criteria verifiziert, Tests+Build grün, Docker-Verifikation, Review

### Docker-E2E-Verifikation (2026-08-26)
- **Klein-Plan**: `/portfolios`, `/financials` → 404; `/api/tenant/portfolios`,
  `/api/tenant/automation-rules`, `/api/tenant/2fa/enroll` → 403; Kernseiten
  (`/dashboard`, `/projects`) weiterhin 200. Invite mit `role=client` → 403
  ("Client-Portal ist im aktuellen Plan nicht enthalten"), `role=member` → 201.
  `PATCH /api/tenant/tenant-settings {require2fa:true}` → 403, `{currency:"EUR"}`
  (Kernfeld) weiterhin 200. Öffentliche `/shared/[token]`-Seite bleibt
  ungegatet (200) unabhängig vom Plan.
- **Klein + 2FA-Add-on**: `/api/tenant/2fa/enroll` → 200 (Secret generiert),
  `/financials` bleibt weiterhin 404 (Add-on gewährt nur das gebuchte Feature).
- **Enterprise-Plan**: `/portfolios`, `/financials` → 200,
  `/api/tenant/organization/slack-capture` → 200.
- **Dedizierte Infrastruktur**: `POST /api/tenants` mit `tier=dedicated` +
  `plan=small` → 400 ("nur im Enterprise-Plan verfügbar"); mit `plan=enterprise`
  funktioniert es (bereits im `tieredTenantInfra.test.ts` abgedeckt).
- **Deaktivierung**: Tenant per `PATCH /api/tenants/[id] {status:"disabled"}`
  deaktiviert → `/dashboard` und sogar `/login` liefern danach 404 (die
  bestehende `proxy.ts`-Statusprüfung greift automatisch). Reaktivierung
  (`{status:"active"}`) stellt den Zugriff ohne Datenverlust wieder her
  (Plan/Add-ons blieben während der Deaktivierung unverändert erhalten).
- `/tenants` und `/tenants/new` (Admin-UI) rendern 200.

### Architekturentscheidung
Durchsetzung läuft zentral in `src/proxy.ts` über pfadbasierte Regex-Gates
(`src/tenant/entitlements/routeGates.ts`) — deckt sowohl Pages als auch API-
Routen ab, ohne dass einzelne Route-Dateien angefasst werden mussten. Nur zwei
Routen, die gegatete UND Kernfelder im selben Endpoint bedienen
(`tenant-settings` PATCH, `invites` POST), bekamen einen direkten Inline-Check,
da pfadbasiertes Gating dort zu grob wäre.

### Bewusst nicht gegatet
- `search-modifiers`: gleiche Route wie die Basis-Suche, Gating-Aufwand steht
  in keinem Verhältnis zum Nutzen.
- `workflow-transition-rules`: nur die API-Routen sind gegatet, nicht die
  gesamte Projekt-Workflow-Seite (die auch Kern-Status-Editing enthält).
