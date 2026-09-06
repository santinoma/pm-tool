# Task List: budgeting-v2

Siehe `tasks/plan-budgeting-v2.md` und `SPEC-budgeting-v2.md`.

## Phase 1: Datenmodell — ✅ erledigt
### Task 1: Tenant-Schema erweitern
**Beschreibung:** `Budget` (projectId, title, ownerId), `BudgetSection` (budgetId, name, budgetedTimeHours, quantity, price, budgetUsed default 0), `BudgetSectionAssignee` (sectionId, userId Join).

## Checkpoint: Schema — ✅ erreicht

## Phase 2: Reine Logik — ✅ erledigt
### Task 2: `computeSectionTotals()` — 4 Tests grün

## Phase 3: API — ✅ erledigt, via Docker verifiziert (403 für member)
### Task 3: Budget-Routen
### Task 4: Section-Routen + Integrationstest — 3 Tests grün

## Phase 4: UI — ✅ erledigt, via Docker verifiziert
### Task 5: Sidebar "Financials" + Projekt-Auswahl
### Task 6: Budget-Liste + Anlegen
### Task 7: Section-Tabelle inkl. inline-Edit + Personen-Zuordnung

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (Budget anlegen, Section mit Personen, Total=quantity*price=4800, Used editierbar, Remaining/Usage% korrekt, 403 für member)
- [x] `npm test` (221 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [x] Review mit Mensch vor Abschluss des Moduls
