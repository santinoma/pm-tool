# Implementation Plan: workflow-transition-rules

## Overview
`TransitionRule` pro Projekt (`fromStatusId` optional, `toStatusId`
Pflicht, `requiredFieldKeys String[]`). Eingebaute Feld-Keys:
`assignee`, `dueDate`, `estimatedHours`. Custom-Field-Keys:
`custom:<CustomFieldDefId>`. Validierung läuft als reine Funktion, die von
der bestehenden `PATCH /api/tenant/tasks/[id]`-Route vor dem eigentlichen
Update aufgerufen wird.

## Architecture Decisions
- `requiredFieldKeys` als `String[]`-Spalte statt eigener Join-Tabelle —
  analog zu `CustomFieldDef.options`, ausreichend für eine flache Liste
  ohne weitere Metadaten pro Feld.
- Validierung prüft "effektive" Werte: Body-Wert falls im PATCH mitgeschickt,
  sonst aktueller Task-Wert. Custom-Field-Werte werden nur aus der DB
  gelesen (können nicht im selben Request gesetzt werden).
- Bei mehreren passenden Regeln (spezifisch + `fromStatusId=null`) werden
  die `requiredFieldKeys` vereinigt (Set), nicht die restriktivste gewählt.
- Regel-Verwaltung erweitert die bestehende Workflow-Settings-Seite statt
  eine neue Route zu eröffnen.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `TransitionRule`-Modell, Migration

### Checkpoint: Schema
- [ ] Migration, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `findMissingRequiredFields()` (Regel-Matching + Feld-Prüfung) + Tests

### Phase 3: API
- [ ] Task 3: `PATCH /api/tenant/tasks/[id]` ruft die Validierung vor dem Update auf, 400 bei fehlenden Feldern
- [ ] Task 4: `GET`/`POST /api/tenant/projects/[id]/transition-rules`, `DELETE .../[ruleId]` (nur owner/admin) + Integrationstest

### Checkpoint: API
- [ ] Tests grün, Docker: 400 bei fehlendem Pflichtfeld, 403 für member bei Regel-Anlage

### Phase 4: UI
- [ ] Task 5: Übergangsregeln-Sektion in `WorkflowEditorClient` (Liste + Anlegen/Löschen)

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Bestehende Tasks ohne Pflichtfelder werden nach Regel-Anlage "eingefroren" (kein Übergang mehr möglich, bis Feld nachgetragen wird) | Mittel, aber gewolltes Verhalten der Funktion | Fehlermeldung listet genau die fehlenden Felder auf |

## Open Questions
Keine.
