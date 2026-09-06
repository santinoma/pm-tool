# Implementation Plan: resource-planning-basic

## Overview
Wochen-Auslastungsansicht pro Person, cross-projekt. Zwei neue, unabhängige Skalarfelder (`Task.estimatedHours`, `User.weeklyCapacityHours`), zwei reine Hilfsfunktionen (Wochenberechnung, Auslastungsberechnung), eine API-Route für Kapazitäts-Bearbeitung, eine Übersichtsseite.

## Architecture Decisions
- Wochenbestimmung ("aktuelle Woche, Mo–So") als eigene reine Funktion, UTC-basiert, analog zum bestehenden Gantt-Datumshandling (`differenceInDays`/`addDays`-Stil) — vermeidet Off-by-one-Fehler durch lokale Zeitzonen.
- Auslastung wird ausschließlich aus `estimatedHours` berechnet, nicht aus `TimeEntry` — bewusst getrennt von `time-tracking`/`budgeting-basic`, die auf Ist-Werten basieren; das ist eine planende, keine rückblickende Sicht.
- Kein neues Datenmodell für "Kapazität" — beide Felder sind einfache Skalare auf bestehenden Modellen (`Task`, `User`).

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema erweitern (`Task.estimatedHours`, `User.weeklyCapacityHours`)

### Checkpoint: Schema
- [ ] Migration angewendet, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `getCurrentWeekRange()` in `src/tenant/resourcePlanning/week.ts` + Unit-Tests
- [ ] Task 3: `computeUtilization()` in `src/tenant/resourcePlanning/utilization.ts` + Unit-Tests

### Phase 3: API + UI
- [ ] Task 4: `PATCH /api/tenant/users/[id]/capacity` (nur owner/admin) + Integrationstest
- [ ] Task 5: `/resource-planning/page.tsx` — Übersicht aller Personen mit Drill-down

### Checkpoint: Abschluss
- [ ] Integrationstest (`tests/resourcePlanning.test.ts`) grün
- [ ] `npm test` und `npm run build` grün
- [ ] Docker/curl: Auslastung über mehrere Projekte korrekt summiert, Tasks ohne dueDate/estimatedHours ausgeschlossen, 403 für member bei Kapazitäts-PATCH
- [ ] Review mit Mensch vor Abschluss des Moduls

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Zeitzonen-Fehler bei Wochenberechnung (Task fällt an falschem Wochenrand rein/raus) | Mittel | UTC-sichere reine Funktion + explizite Randfall-Tests (Sonntag 23:59 UTC, Montag 00:00 UTC) |
| Verwechslung mit Ist-Werten aus time-tracking | Niedrig | Klare Doku im Spec: diese Sicht ist planend (estimatedHours), nicht rückblickend |

## Open Questions
Keine — Spec vom Menschen bestätigt.
