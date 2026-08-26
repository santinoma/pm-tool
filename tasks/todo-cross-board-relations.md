# Task List: cross-board-relations

Siehe `tasks/plan-cross-board-relations.md` und `SPEC-cross-board-relations.md`.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: `TaskLink`-Modell, Migration

## Phase 2: Reine Logik — ✅ erledigt
- [x] Task 2: `resolveLinkedTasks()` + Tests (4 Tests grün)

## Phase 3: API — ✅ erledigt, via Docker verifiziert
- [x] Task 3: `GET`/`POST /api/tenant/tasks/[id]/links`, `DELETE .../[linkId]`
- [x] Task 4: `GET /api/tenant/tasks/search` + Integrationstest (`tests/taskLinks.test.ts`, 3 Tests grün)

## Phase 4: UI — ✅ erledigt, via Docker verifiziert
- [x] Task 5: "Verlinkte Tasks"-Sektion auf der Task-Detailseite (Liste + Verlinken-Suche + Entfernen)

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (projektübergreifende Suche funktioniert, Link auf beiden Seiten sichtbar, Mirror-Status aktualisiert sich sofort nach Statuswechsel ohne den Link-Datensatz zu ändern, Duplikat-Link liefert 409, Löschen entfernt von beiden Seiten)
- [x] `npm test` (309 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
