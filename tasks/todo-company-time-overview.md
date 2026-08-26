# Task List: company-time-overview

Siehe `tasks/plan-company-time-overview.md` und `SPEC-company-time-overview.md`.

## Phase 1: Reine Logik — ✅ erledigt
- [x] Task 1: `buildWeekSummary()` + Tests (4 Tests grün)

## Phase 2: UI — ✅ erledigt, via Docker verifiziert
- [x] Task 2: `/time/company` Wochentabelle (Wochennavigation via `?week=`)
- [x] Task 3: Tageszelle aufklappbar (Zeiteintragungs-Modus) — Detailansicht ohne Stundensatz

## Checkpoint: Abschluss — ✅ erreicht
- [x] Success-Criteria verifiziert (Timer-Modus: 8h/Tag durch genehmigte Absenz markiert mit 🏖; Zeiteintragungs-Modus: 0.25h für 15-Min-Eintrag korrekt aggregiert, Service+Zeitspanne+Beschreibung im Detail-Payload vorhanden, kein Stundensatz)
- [x] `npm test` (239 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
