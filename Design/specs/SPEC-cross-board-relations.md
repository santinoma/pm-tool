# Spec: cross-board-relations (v2 Modul 8)

## Objective
Ein Task kann mit einem beliebigen Task in jedem Projekt verlinkt werden
(Connect). Die Task-Detailseite zeigt zu jedem verlinkten Task einen live
gespiegelten Status (Mirror) sowie Projekt und Zuständige Person — Monday-
artige Board-übergreifende Verknüpfung, angepasst an das bestehende
Datenmodell ohne konfigurierbare Board-Spalten.

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
prisma/tenant/schema.prisma                 → TaskLink
src/tenant/taskLinks/taskLinkView.ts        → reine Aufbereitung (beide Linkrichtungen zu einer Liste)
src/app/api/tenant/tasks/[id]/links/route.ts        → GET/POST
src/app/api/tenant/tasks/[id]/links/[linkId]/route.ts → DELETE
src/app/api/tenant/tasks/search/route.ts    → GET (Titel-Suche projektübergreifend, für den Verlinken-Picker)
src/app/(tenant)/projects/[id]/tasks/[taskId]/  → UI-Erweiterung: "Verlinkte Tasks"-Sektion
tests/                                       → Unit + Integrationstest
```

## Code Style
Bestehende Muster: Field-Atlas-CSS, offene Bearbeitungsrechte wie bei
bestehenden Task-PATCH-Routen (keine Rollen-Guard).

## Testing Strategy
Vitest für die reine Aufbereitungsfunktion (beide Linkrichtungen zu einer
einheitlichen Liste zusammenführen). Integrationstest: Link anlegen →
auf beiden Tasks sichtbar; Status-Änderung am Ziel-Task spiegelt sich
sofort (kein Cache); Link löschen entfernt ihn von beiden Seiten. Docker-
E2E: projektübergreifend verlinken, Mirror-Status nach Statuswechsel
prüfen.

## Boundaries
- Always: Mirror-Werte live aus der DB lesen, nie duplizieren/cachen.
- Ask first: Konfigurierbare Mirror-Felder (welches Feld gespiegelt wird)
  — v1 zeigt immer Status, Projekt, Zuständige Person fest.
- Never: `TaskLink` mit `TaskDependency` vermischen — bleiben getrennte
  Konzepte (Referenz ohne Workflow-Bedeutung vs. blockierende Abhängigkeit).

## Success Criteria
- Ein Task kann über eine Titel-Suche mit einem Task aus jedem Projekt
  (auch demselben) verlinkt werden.
- Der Link ist auf beiden Tasks sichtbar, mit live gespiegeltem Status,
  Projekt und Zuständiger Person.
- Eine Statusänderung am verlinkten Task spiegelt sich beim nächsten
  Laden sofort, ohne dass der Link-Datensatz selbst geändert wird.
- Ein Link kann von beiden Seiten aus gelöscht werden.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt.
