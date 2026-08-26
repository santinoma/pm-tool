# Implementation Plan: retainer-tracking

## Overview
`Budget.isRetainer` + `Budget.recurrenceInterval` (monthly/weekly). Die
Budget-Detailseite berechnet bei einem Retainer server-seitig die
aktuelle Periode (Monats-/Wochengrenzen), lädt nur die Zeiteinträge der
Sections innerhalb dieser Grenzen und übergibt sie an eine reine
Burn-Funktion.

## Architecture Decisions
- Periodengrenzen sind eine reine Funktion von "jetzt" + Intervall, keine
  gespeicherten Perioden-Datensätze — die aktuelle Periode ist immer aus
  dem Kalender ableitbar.
- Burn-Berechnung ist unabhängig von `budgetUsed` (das Feld bleibt für
  Nicht-Retainer-Budgets unverändert im Einsatz).
- `recurrenceInterval` ist nur relevant, wenn `isRetainer=true`; bei
  `false` bleibt es `null`.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `Budget.isRetainer`, `Budget.recurrenceInterval`, Migration

### Checkpoint: Schema
- [ ] Migration, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `computeCurrentPeriod()` (Monats-/Wochengrenzen) + Tests
- [ ] Task 3: `computeSectionBurn()` (Kontingent/verbraucht/verbleibend/%) + Tests

### Phase 3: API
- [ ] Task 4: `POST /api/tenant/budgets` erweitert um `isRetainer`/`recurrenceInterval`

### Phase 4: UI
- [ ] Task 5: Retainer-Checkbox + Intervall-Auswahl im Budget-Anlegen-Formular
- [ ] Task 6: Live-Burn-Panel auf der Budget-Detailseite (nur wenn `isRetainer`)

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Zeitzonen-Randfälle an Monats-/Wochengrenzen | Niedrig (v1-Scope, UTC-Kalendergrenzen ausreichend) | Grenzen bewusst auf UTC-Kalendertage berechnet, wie bei `getCurrentWeekRange` bereits etabliert |

## Open Questions
Keine.
