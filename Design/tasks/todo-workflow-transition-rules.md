# Task List: workflow-transition-rules

Siehe `tasks/plan-workflow-transition-rules.md` und `SPEC-workflow-transition-rules.md`.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: `TransitionRule`-Modell, Migration

## Phase 2: Reine Logik — ✅ erledigt
- [x] Task 2: `findMissingRequiredFields()` / `collectRequiredFieldKeys()` + Tests (8 Tests grün)

## Phase 3: API — ✅ erledigt, via Docker verifiziert
- [x] Task 3: `PATCH /api/tenant/tasks/[id]` validiert vor dem Update, 400 bei fehlenden Feldern
- [x] Task 4: CRUD-Routen für Regeln + Integrationstest (`tests/transitionRules.test.ts`, 3 Tests grün)

## Phase 4: UI — ✅ erledigt, via Docker verifiziert
- [x] Task 5: Übergangsregeln-Sektion in `WorkflowEditorClient` (Liste + Anlegen/Löschen)

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (400 bei fehlendem Pflichtfeld, 200 wenn im selben Request mitgeliefert, 403 für member bei Regel-Anlage, UI zeigt Regeln)
- [x] `npm test` (265 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
