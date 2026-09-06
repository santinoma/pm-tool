# Task List: retainer-tracking

Siehe `tasks/plan-retainer-tracking.md` und `SPEC-retainer-tracking.md`.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: `Budget.isRetainer`, `Budget.recurrenceInterval`, Migration

## Phase 2: Reine Logik — ✅ erledigt
- [x] Task 2: `computeCurrentPeriod()` + Tests (3 Tests grün)
- [x] Task 3: `computeSectionBurn()` + Tests (5 Tests grün)

## Phase 3: API — ✅ erledigt
- [x] Task 4: `POST /api/tenant/budgets` erweitert um `isRetainer`/`recurrenceInterval`

## Phase 4: UI — ✅ erledigt, via Docker verifiziert
- [x] Task 5: Retainer-Checkbox + Intervall-Auswahl im Budget-Anlegen-Formular
- [x] Task 6: Live-Burn-Panel auf der Budget-Detailseite (nur wenn `isRetainer`)

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (Burn-Anzeige zeigt korrekt 5.0h/40.0h (13%) für Zeiteintrag im laufenden Monat, Scale-Bar-Breite korrekt, Nicht-Retainer-Budgets zeigen kein Live-Burn-Panel)
- [x] `npm test` (288 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
