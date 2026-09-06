# Implementation Plan: company-time-overview

## Overview
Server-seitig für die gewählte Woche: alle aktiven User + ihre TimeEntries
(mit `durationMinutes`) + genehmigte AbsenceRequests laden, in einer reinen
Funktion zu einer Matrix User×Wochentag (Stunden + Entry-Liste + Absenz-Flag)
aggregieren, und clientseitig als Tabelle mit aufklappbaren Zellen rendern.

## Architecture Decisions
- Reine Funktion `buildWeekSummary(users, entries, approvedAbsences, weekStart)`
  in `src/tenant/companyTime/weekSummary.ts` — keine DB-Zugriffe, leicht testbar.
- Stunden = `durationMinutes / 60`, gerundet auf 2 Nachkommastellen für die Anzeige.
- Ein Tag gilt als "Absenz" wenn eine `AbsenceRequest` mit `status=approved`
  den Tag überdeckt (start ≤ Tag ≤ end); die Stunden dafür sind
  `computeCreditedHours(1, user.weeklyCapacityHours)` (aus absence-management
  wiederverwendet) und werden zur gebuchten Zeit addiert, nicht ersetzt.
- Detailansicht (Entry-Liste pro Tag) wird bereits serverseitig mitgeliefert
  (kein Nachladen per Klick nötig) — Zeiteinträge pro Woche sind klein genug.

## Task List

### Phase 1: Reine Logik
- [ ] Task 1: `buildWeekSummary()` + Tests (Stunden-Summe, Absenz-Flag, Rundung)

### Checkpoint: Logik
- [ ] Tests grün

### Phase 2: UI
- [ ] Task 2: `/time/company` lädt Woche, rendert Tabelle (User × Mo–So + Summe)
- [ ] Task 3: Tageszelle im Zeiteintragungs-Modus aufklappbar (Detailansicht ohne Stundensatz)

### Checkpoint: Abschluss
- [ ] Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Große Tenants mit vielen Usern/Einträgen pro Woche | Niedrig (v0.2-Scope) | Woche ist zeitlich eng begrenzt, keine Pagination nötig |

## Open Questions
Keine.
