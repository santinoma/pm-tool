# Task List: automation-rules

Siehe `tasks/plan-automation-rules.md` und `SPEC-automation-rules.md`.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: `AutomationRule` + `AutomationAction` + Enums, Migration

## Phase 2: Reine Logik — ✅ erledigt
- [x] Task 2: `runAutomations()` / `selectMatchingRules()` + Tests (5 Tests grün)

## Phase 3: API — ✅ erledigt, via Docker verifiziert
- [x] Task 3: `recordActivity()` erweitert (`taskId`, `statusCategory`), ruft `runAutomations()` auf
- [x] Task 4: CRUD-Routen + Integrationstest (`tests/automationRules.test.ts`, 3 Tests grün)

## Phase 4: UI — ✅ erledigt, via Docker verifiziert
- [x] Task 5: `/settings/organization/automations` Regel-Verwaltung (Anlegen, Aktiv-Toggle, Löschen)

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (Auto-Zuweisung bei task_created, bedingte Benachrichtigung nur bei Status-Kategorie "done", deaktivierte Regel läuft nicht, 403 für member)
- [x] `npm test` (254 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
