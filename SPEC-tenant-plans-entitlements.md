# Spec: tenant-plans-entitlements

## Objective
Beim Anlegen eines Tenants wählt der Platform-Admin eine Lizenzart (Plan):
Klein, Mittelstand, Enterprise. Je nach Plan sind unterschiedliche Feature-Module
freigeschaltet. Zusätzlich lässt sich ein Tenant nicht nur löschen, sondern auch
deaktivieren (Zugriff gesperrt, Daten bleiben erhalten, reaktivierbar).

## Assumptions (bestätigt)
1. Plan-Feature-Zuordnung:
   - **Klein**: nur Kernmodule (Projekte, Tasks, Board/Liste/Kalender/Gantt/Hill-Chart,
     Zeiterfassung, Reports, Wiki, Check-ins). 2FA/SCIM ist als Zusatzbuchung
     (Add-on) optional aktivierbar.
   - **Mittelstand**: Klein + Budgets/Financials/Invoicing, Cycles/Sprints,
     Automation Rules, Workflow-Transition-Rules, Retainer-Tracking (Teil von
     Budgets), Client-Portal, Shared Views, Cross-Board-Relations,
     Integrations-Marketplace, **2FA/SCIM inklusive**.
   - **Enterprise**: Mittelstand + Portfolios & Goals, Baseline-Diffing,
     Slack-to-Issue-Capture, Option auf dedizierte Infrastruktur (Tenant-Tier
     "dedicated" nur bei Enterprise wählbar).
2. Durchsetzung: Navigation blendet nicht enthaltene Module aus; zugehörige
   API-Routen liefern zusätzlich 403 (zentral in `proxy.ts`, analog zum
   bestehenden Client-Portal/2FA-Muster — keine Änderungen an einzelnen
   Route-Dateien nötig, da `proxy.ts` vor jedem Request inkl. `/api/*` läuft).
3. Deaktivierung: `TenantStatus` bekommt einen neuen Wert `disabled`. `proxy.ts`
   blockt bereits heute alles außer `status === "active"` mit 404 — ein
   deaktivierter Tenant ist damit automatisch gesperrt, ohne Datenverlust
   (DB bleibt bestehen, Reaktivierung setzt nur den Status zurück).
4. `search-modifiers` wird NICHT separat gegatet (gleiche Route wie die
   Basis-Suche, Gating lohnt den Aufwand nicht).
5. `workflow-transition-rules` gatet nur die API-Routen, nicht die ganze
   Projekt-Workflow-Seite (die auch Kern-Status-Editing enthält).

## Tech Stack
Next.js App Router, TypeScript, Prisma (platform + tenant DB), Vitest.

## Project Structure
- `src/tenant/entitlements/features.ts` — `FEATURE_KEYS`, `PLAN_FEATURES`, `computeEntitledFeatures()`, `hasFeature()`
- `src/tenant/entitlements/routeGates.ts` — Pfad-Muster → Feature-Key, `resolveMissingFeature()`
- `src/proxy.ts` — Durchsetzung (Pages 404, API 403), Deaktivierung (bereits vorhandene Statuslogik)
- `src/tenant/context.ts` — `TenantContext.entitledFeatures`
- `src/ui/shell/AppShell.tsx`, `ProjectSubnav.tsx` — Nav-Filterung per Prop
- `src/app/(platform-admin)/tenants/new/page.tsx` — Plan-Auswahl + 2FA-Add-on-Checkbox
- `src/app/(platform-admin)/tenants/[id]/route.ts` (PATCH, neu) — Status-Toggle
- `tests/entitlements.test.ts`, `tests/tenantPlans.test.ts`

## Testing Strategy
Vitest Unit-Tests für `computeEntitledFeatures()`/`resolveMissingFeature()`,
Integrationstest über `provisionTenant()`, Docker-E2E via curl (gesperrte vs.
erlaubte Route je Plan, Deaktivierung blockt Zugriff, Reaktivierung stellt ihn
wieder her).

## Boundaries
- Always: Enforcement zentral in `proxy.ts`/Entitlements-Modul, nicht in
  einzelnen Route-Dateien verstreut.
- Ask first: Änderungen an der Plan→Feature-Zuordnung nach Auslieferung.
- Never: Tenant-Daten beim Deaktivieren löschen.

## Success Criteria
- Tenant mit Plan "Klein" anlegen → `/portfolios`, `/financials` liefern 404,
  zugehörige API-Routen 403.
- Tenant mit Plan "Enterprise" anlegen → alle Module erreichbar.
- Tenant deaktivieren → jeder Tenant-Request liefert 404, Daten bleiben in der DB.
- Tenant reaktivieren → Zugriff funktioniert wieder unverändert.
