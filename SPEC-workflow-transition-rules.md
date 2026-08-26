# Spec: workflow-transition-rules (v2 Modul 2)

## Objective
Owner/Admin können pro Projekt festlegen: "Beim Übergang von [Status A oder
beliebig] nach [Status B] müssen folgende Felder gesetzt sein." Verhindert
unvollständige Tasks beim Statuswechsel (z. B. "Done" nur mit gesetzter
Zuständigkeit).

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
prisma/tenant/schema.prisma                     → TransitionRule
src/tenant/workflow/transitionValidation.ts     → reine Prüf-Logik
src/app/api/tenant/projects/[id]/transition-rules/route.ts        → GET/POST
src/app/api/tenant/projects/[id]/transition-rules/[ruleId]/route.ts → DELETE
src/app/api/tenant/tasks/[id]/route.ts           → PATCH erweitert um Validierung
src/app/(tenant)/projects/[id]/settings/workflow/  → UI-Erweiterung (WorkflowEditorClient)
tests/                                           → Unit + Integrationstest
```

## Code Style
Bestehende Muster: `canManageMembers`-Guard für Regel-CRUD, Field-Atlas-CSS,
Fehlermeldungen als `{ error: string }` mit passendem HTTP-Status.

## Testing Strategy
Vitest für die reine Validierungsfunktion (welche Regeln greifen, welche
Felder fehlen). Integrationstest: PATCH mit fehlendem Pflichtfeld → 400,
mit allen Pflichtfeldern gesetzt → 200. Docker-E2E: Regel anlegen, Übergang
ohne Pflichtfeld blockieren, mit Pflichtfeld erlauben, 403 für member beim
Regel-Anlegen.

## Boundaries
- Always: Validierung läuft serverseitig in der bestehenden
  `PATCH /api/tenant/tasks/[id]`-Route, nicht nur im Frontend.
- Ask first: Eine visuelle Workflow-Graph-Editor-UI — für v1 genügt eine
  einfache Liste/Formular.
- Never: Bei fehlendem Pflichtfeld Teile der Anfrage stillschweigend
  übernehmen und nur den Status zurückweisen — die gesamte Anfrage wird
  abgelehnt (400), bevor irgendetwas geschrieben wird.

## Success Criteria
- Owner/Admin kann eine Regel anlegen: `fromStatusId` (optional, leer =
  beliebig), `toStatusId` (Pflicht), Liste der Pflichtfelder (eingebaut
  und/oder Custom Fields des Projekts).
- Ein Statuswechsel, der eine passende Regel erfüllt, aber ein Pflichtfeld
  offen lässt, wird mit 400 und der Liste der fehlenden Felder abgelehnt.
- Sind alle Pflichtfelder (aktuell oder im selben Request) gesetzt, geht
  die Änderung durch.
- Mehrere passende Regeln kombinieren ihre Pflichtfelder (Vereinigung).
- 403 für `member` beim Anlegen/Löschen von Regeln.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt.
