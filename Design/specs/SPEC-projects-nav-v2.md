# Spec: projects-nav-v2

## Objective
Zwei Verbesserungen am Projekt-Arbeitsbereich: (1) die Sidebar-Navigation trennt "Meine Tasks" (cross-projekt, mir zugewiesen) von "Projekte" (Liste aller Projekte), (2) Tasks können direkt in einem Projekt per Button angelegt werden — ohne zwingend über die Triage zu laufen. Ob Triage überhaupt zwischengeschaltet ist, wird neu als Tenant-Einstellung konfigurierbar.

**Nutzer:** Alle Tenant-Nutzer (Meine Tasks, Neuer-Task-Button); Owner/Admin (Triage-Einstellung).

**Erfolg:** "Meine Tasks" zeigt alle mir zugewiesenen, nicht-Done-Tasks über alle Projekte; "Projekte" zeigt zusätzlich den Fortschritt pro Projekt; ein "Neuer Task"-Button in List/Board legt einen Task direkt an; ist Triage tenant-weit deaktiviert, landet der neue Task sofort im Board statt in der Triage.

## Tech Stack
Next.js (App Router) + TypeScript + PostgreSQL + Prisma — unverändert.

## Project Structure
```
prisma/tenant/schema.prisma                    → TenantSettings.triageEnabled (Boolean, default true)
src/app/api/tenant/tasks/route.ts               → POST respektiert triageEnabled (inTriage: false, wenn deaktiviert)
src/app/api/tenant/tenant-settings/route.ts     → PATCH erweitert um triageEnabled
src/app/(tenant)/my-tasks/page.tsx              → neue Seite: cross-projekt Tasks, mir zugewiesen
src/app/(tenant)/projects/page.tsx              → Liste erweitert um Fortschritts-Spalte
src/app/(tenant)/settings/organization/page.tsx → Triage-Toggle ergänzt
src/app/(tenant)/projects/[id]/layout.tsx       → lädt triageEnabled, reicht an ProjectSubnav weiter
src/ui/shell/ProjectSubnav.tsx                  → "Triage"-Tab nur sichtbar, wenn triageEnabled
src/ui/shell/AppShell.tsx                       → Sidebar: "Projekte" → "Meine Tasks" + "Projekte"
src/app/(tenant)/projects/[id]/list/ListClient.tsx   → "Neuer Task"-Inline-Formular
src/app/(tenant)/projects/[id]/board/BoardClient.tsx → "Neuer Task"-Inline-Formular
tests/tenantSettingsTriage.test.ts               → Integrationstest (Task-Erstellung mit/ohne Triage)
```

## Code Style
Bestehendes Muster: reine Entscheidung, ob ein neuer Task in Triage landet, als kleine reine Funktion testbar:
```ts
export function resolveInitialTriageState(triageEnabled: boolean): boolean {
  return triageEnabled;
}
```
(Trivial, aber hält die Entscheidung an einer Stelle testbar und dokumentiert statt inline in der Route verstreut.)

## Testing Strategy
Vitest. Integrationstest gegen eine per `provisionTenant()` erzeugte Tenant-DB: Task-Erstellung mit `triageEnabled: true` (Default) landet in Triage wie bisher; mit `triageEnabled: false` landet der Task sofort mit `inTriage: false` im Default-Status. Seiten (Meine Tasks, erweiterte Projekt-Liste, Neuer-Task-Formulare) werden manuell via Docker/curl verifiziert.

## Boundaries
- **Always:** Bestehende Tenants behalten das bisherige Verhalten (`triageEnabled` default `true`) — keine stille Verhaltensänderung für bestehende Kunden.
- **Ask first:** Entfernen der Triage-Funktionalität selbst (bleibt bestehen, wird nur optional überspringbar).
- **Never:** Der "Neuer Task"-Button erzeugt niemals einen Task ohne Projekt-Zuordnung.

## Success Criteria
- Sidebar zeigt "Meine Tasks" und "Projekte" als getrennte Einträge.
- "Meine Tasks" zeigt nur Tasks mit `assigneeId = aktueller Nutzer`, `inTriage: false`, über alle Projekte hinweg.
- "Projekte"-Liste zeigt eine Fortschritts-%-Spalte pro Projekt.
- `triageEnabled: false` führt dazu, dass ein per Button/Command-Palette neu angelegter Task sofort in List/Board erscheint, nicht in der Triage.
- `triageEnabled: true` (Default) verhält sich exakt wie bisher.
- Der "Triage"-Tab in der Projekt-Subnav verschwindet, wenn `triageEnabled` für den Tenant `false` ist.

## Open Questions
Keine — Annahmen inkl. der Triage-Einstellungs-Erweiterung vom Menschen bestätigt.
