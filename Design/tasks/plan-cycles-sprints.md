# Implementation Plan: cycles-sprints + cycle-insights

## Overview
`Cycle` pro Projekt (Name, Start-/Enddatum). `Task` bekommt `cycleId`
(optional) + `cycleAssignedAt` (gesetzt/aktualisiert, wann immer sich
`cycleId` ändert). Insights sind eine reine Funktion über
Task-Rohdaten (Status-Kategorie, `estimatedHours`, `cycleAssignedAt`)
plus dem Cycle-Startdatum.

## Architecture Decisions
- `cycleAssignedAt` wird in der bestehenden `PATCH /api/tenant/tasks/[id]`
  serverseitig gesetzt (nicht vom Client mitgeschickt), sobald `cycleId`
  sich ändert — verhindert manipulierte Scope-Creep-Zeitstempel.
- Scope Creep basiert auf `cycleAssignedAt > cycle.startDate`, nicht auf
  `task.createdAt` — ein alter Task, der erst später einem Cycle
  zugeordnet wird, zählt korrekt als Scope Creep für diesen Cycle.
- `estimatedHours` ohne Wert (`null`) zählt in Velocity/Scope-Summen als 0
  — kein Blocker, aber auch kein Beitrag.
- Neuer Subnav-Tab "Cycles" nach dem Muster von `showTriage` in
  `ProjectSubnav`.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `Cycle`, `Task.cycleId`/`cycleAssignedAt`, Migration

### Checkpoint: Schema
- [ ] Migration, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `computeCycleInsights()` (Velocity, Scope-Creep-%, erledigt/gesamt) + Tests

### Phase 3: API
- [ ] Task 3: `GET`/`POST /api/tenant/projects/[id]/cycles` (nur owner/admin für POST)
- [ ] Task 4: `GET /api/tenant/cycles/[id]` (Tasks + Insights); `PATCH /api/tenant/tasks/[id]` erweitert um `cycleId` + Integrationstest

### Checkpoint: API
- [ ] Tests grün, Docker: Scope-Creep-Berechnung korrekt, 403 für member

### Phase 4: UI
- [ ] Task 5: `ProjectSubnav`-Tab "Cycles"
- [ ] Task 6: `/projects/[id]/cycles` Liste + Anlegen
- [ ] Task 7: `/projects/[id]/cycles/[cycleId]` Detail + Insights + Task-Zuordnung

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope-Creep-Zeitstempel vom Client manipulierbar | Mittel | Serverseitig gesetzt, nicht Teil des Request-Bodys |

## Open Questions
Keine.
