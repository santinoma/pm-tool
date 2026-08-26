# Implementation Plan: cross-board-relations

## Overview
`TaskLink` (sourceTaskId, targetTaskId) als einzelne gerichtete Zeile pro
Verknüpfung. Beim Anzeigen wird für einen gegebenen Task nach beiden
Richtungen gesucht (`sourceTaskId = X OR targetTaskId = X`) und die
jeweils andere Seite als "verlinkter Task" aufgelöst — eine reine Funktion
macht daraus eine einheitliche Liste unabhängig von der Speicherrichtung.

## Architecture Decisions
- Keine Duplizierung der Zeile in beide Richtungen — eine Zeile reicht,
  die Abfrage prüft beide Spalten.
- Mirror-Felder (Status, Projekt, Zuständige Person) werden bei jedem
  Seitenaufruf frisch aus der DB gelesen (`include`), nie im `TaskLink`
  selbst gespeichert.
- Verlinken-Suche ist eine einfache `contains`-Titelsuche über alle
  Tasks des Tenants (kein Volltextindex nötig für v1-Scope).

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `TaskLink`-Modell, Migration

### Checkpoint: Schema
- [ ] Migration, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `resolveLinkedTasks()` (beide Richtungen → einheitliche Liste) + Tests

### Phase 3: API
- [ ] Task 3: `GET`/`POST /api/tenant/tasks/[id]/links`, `DELETE .../[linkId]`
- [ ] Task 4: `GET /api/tenant/tasks/search` (Titel-Suche für den Picker) + Integrationstest

### Checkpoint: API
- [ ] Tests grün, Docker: Mirror-Status aktualisiert sich nach Statuswechsel

### Phase 4: UI
- [ ] Task 5: "Verlinkte Tasks"-Sektion auf der Task-Detailseite (Liste + Verlinken-Suche + Entfernen)

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Duplikat-Links (A→B und B→A gleichzeitig) | Niedrig | Beim Anlegen wird auf beide Richtungen geprüft, bevor eine neue Zeile erstellt wird |

## Open Questions
Keine.
