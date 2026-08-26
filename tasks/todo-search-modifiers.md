# Task List: search-modifiers

Siehe `tasks/plan-search-modifiers.md` und `SPEC-search-modifiers.md`.

## Phase 1: Reine Logik — ✅ erledigt
- [x] Task 1: `parseSearchQuery()` + Tests (7 Tests grün)

## Phase 2: API — ✅ erledigt, via Docker verifiziert
- [x] Task 2: `/api/tenant/search` wendet Modifier an (status/assignee/project, kombinierbar + Freitext)

## Phase 3: UI — ✅ erledigt (Build grün; Cmd+K-Interaktion selbst mangels Browser-Zugriff nicht visuell testbar, wie bereits bei `projects-tasks` dokumentiert)
- [x] Task 3: Advanced-Toggle + Kurzreferenz in `CommandPalette`

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (status:done, assignee:me, project:"Name" einzeln und kombiniert liefern korrekt gefilterte Tasks; Suche ohne Modifier unverändert Projekte+Tasks)
- [x] `npm test` (316 Tests) und `npm run build` grün
- [x] Docker-Verifikation (API-Ebene; Advanced-Toggle-Sichtprüfung mangels Browser-Zugriff nicht möglich)
- [ ] Review mit Mensch vor Abschluss des Moduls
