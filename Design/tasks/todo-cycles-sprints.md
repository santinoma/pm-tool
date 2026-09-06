# Task List: cycles-sprints + cycle-insights

Siehe `tasks/plan-cycles-sprints.md` und `SPEC-cycles-sprints.md`.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: `Cycle`, `Task.cycleId`/`cycleAssignedAt`, Migration

## Phase 2: Reine Logik — ✅ erledigt
- [x] Task 2: `computeCycleInsights()` + Tests (5 Tests grün)

## Phase 3: API — ✅ erledigt, via Docker verifiziert
- [x] Task 3: `GET`/`POST /api/tenant/projects/[id]/cycles` (nur owner/admin für POST)
- [x] Task 4: `GET /api/tenant/cycles/[id]`, `PATCH`-Task erweitert um `cycleId` + Integrationstest (`tests/cycleAssignment.test.ts`, 2 Tests grün)

## Phase 4: UI — ✅ erledigt, via Docker verifiziert
- [x] Task 5: `ProjectSubnav`-Tab "Cycles"
- [x] Task 6: `/projects/[id]/cycles` Liste + Anlegen
- [x] Task 7: `/projects/[id]/cycles/[cycleId]` Detail + Insights + Task-Zuordnung

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (Velocity=Summe estimatedHours erledigter Tasks, Scope-Creep korrekt nach Zuordnungs-Zeitpunkt vs. Cycle-Start klassifiziert, 403 für member bei Cycle-Anlage)
- [x] `npm test` (280 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
