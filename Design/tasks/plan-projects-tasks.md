# Implementation Plan: projects-tasks

## Overview
Größtes Modul bisher: Projekte mit konfigurierbaren Status-Workflows, Tasks mit Cross-Tagging/Abhängigkeiten/Custom Fields, vier Ansichten (Liste/Board/Kalender/Gantt), Triage-Inbox, Command-Palette. Wird in klar getrennten Phasen gebaut: erst Datenmodell + Kern-CRUD, dann die vier Ansichten, dann Cmd+K.

## Architecture Decisions
- **Ein Datenmodell, vier Lenses:** alle Ansichten lesen dieselben `Task`-Datensätze, keine view-spezifische Datenhaltung — Filterung/Gruppierung passiert in der jeweiligen Seite, nicht im Schema
- **Zyklus-Erkennung und Default-Workflow-Generierung als reine Funktionen** (`src/tenant/projects/workflow.ts`), damit sie ohne DB getestet werden können — Fortführung des Musters aus den vorherigen Modulen
- **Custom-Field-Werte als String gespeichert, typabhängig geparst:** vermeidet ein komplexes polymorphes Spaltenschema für 4 Typen, Parsing/Validierung liegt in einer eigenen, testbaren Funktion
- **Gantt-Interaktion bewusst begrenzt:** Drag verschiebt/resized nur den gezogenen Task, keine Kaskaden-Neuplanung abhängiger Tasks (siehe SPEC-projects-tasks.md Boundaries)

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema um `Project`, `WorkflowStatus`, `Task`, `TaskProject`, `TaskDependency`, `CustomFieldDef`, `CustomFieldValue` erweitern + Migration

### Phase 2: Reine Logik
- [ ] Task 2: `workflow.ts` — `defaultWorkflowStatuses()`, `detectDependencyCycle()`
- [ ] Task 3: `customFieldValue.ts` — typabhängiges Parsen/Validieren (text/number/select/date)

### Checkpoint: Logik-Grundlagen
- [ ] Unit-Tests für Task 2-3 grün
- [ ] `npm run build` grün

### Phase 3: Projekte & Workflow-Editor
- [ ] Task 4: Projekt-CRUD (anlegen mit Default-Workflow, Liste)
- [ ] Task 5: Workflow-Editor (Status hinzufügen/umbenennen/Reihenfolge/Kategorie, Löschschutz bei referenzierten Tasks)

### Phase 4: Tasks, Cross-Tagging, Abhängigkeiten
- [ ] Task 6: Task-CRUD (anlegen landet in Triage, Zuweisung, primäres Projekt)
- [ ] Task 7: Cross-Tagging (Task zusätzlichem Projekt zuordnen)
- [ ] Task 8: Task-Abhängigkeiten (blockiert/blockiert durch, Zyklus-Ablehnung serverseitig)

### Checkpoint: Kern-Datenflüsse
- [ ] Integrationstests für Task 4-8 grün (echte Tenant-Test-DB)
- [ ] `npm run build` grün

### Phase 5: Custom Fields
- [ ] Task 9: Custom-Field-Definitionen (CRUD pro Projekt) + Werte pro Task setzen/lesen

### Phase 6: Ansichten (Liste, Board, Kalender)
- [ ] Task 10: Triage-Inbox + "Ins Board übernehmen"
- [ ] Task 11: Listen-Ansicht (Sortierung/Filter)
- [ ] Task 12: Board-Ansicht (Spalten = Status, Drag & Drop)
- [ ] Task 13: Kalender-Ansicht

### Checkpoint: Drei Ansichten
- [ ] Manuell im Browser: Triage → Board-Übernahme → Board-Drag ändert Status persistent → Liste/Kalender zeigen denselben Task korrekt
- [ ] Review mit Mensch

### Phase 7: Gantt
- [ ] Task 14: Gantt-Zeitleiste (Balken nach `startDate`/`dueDate`, Abhängigkeitspfeile)
- [ ] Task 15: Gantt-Drag (Verschieben/Resizen ändert Daten persistent)

### Phase 8: Command-Palette
- [ ] Task 16: Such-API (Projekte + Tasks, Fuzzy-Matching)
- [ ] Task 17: Cmd+K-UI (global, Navigation + "Neuer Task"-Schnellaktion)

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria aus SPEC-projects-tasks.md manuell durchgegangen
- [ ] `npm test` und `npm run build` grün
- [ ] Review mit Mensch

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Gantt-Drag-Interaktion ist erfahrungsgemäß fehleranfällig (Off-by-one bei Tagesberechnung, Zeitzonen) | Hoch | Reine Datums-Arithmetik-Funktionen isoliert und unit-getestet, UI-Layer nur "dünn" darüber |
| Zyklische Abhängigkeiten könnten bei komplexen Graphen teuer zu erkennen sein | Niedrig | DFS mit Memoization, Tenant-Datenmengen in v1 klein genug, dass das nicht relevant wird |
| Cross-Tagging + Custom Fields + Workflow-Editor zusammen ergeben viele Freiheitsgrade — Gefahr von Inkonsistenzen (z.B. Task ohne Status nach Status-Löschung) | Mittel | Löschschutz auf Status-Ebene (siehe Boundaries), immer serverseitig geprüft, nie nur im UI |

## Open Questions
- Keine blockierenden
