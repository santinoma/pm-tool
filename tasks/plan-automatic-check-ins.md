# Implementation Plan: automatic-check-ins

## Overview
Projekt-gebundene, wiederkehrende Status-Fragen. Periodenberechnung als reine Funktion, DB-Unique-Constraint verhindert Doppel-Antworten, eine Seite kombiniert Beantwortung + Log + Schedule-Verwaltung.

## Architecture Decisions
- `CheckInSchedule.projectId` erforderlich (nicht nullable) — projekt-gebunden statt tenant-weit, wie vom Menschen entschieden.
- Zielgruppe bleibt implizit "alle Tenant-User" (kein neues Projekt-Mitgliedschafts-Modell — wie bereits bei `resource-planning-basic`/`notifications` etabliert).
- `periodKey` als String (nicht Datum) — für `weekly` der ISO-Montag-Datumsstring der Woche, für `daily` der Tagesstring; ermöglicht einfachen Unique-Constraint und einfache Vergleiche ohne Datumsarithmetik beim Abfragen.
- Zweite Antwort derselben Periode ist ein `upsert` auf den Unique-Key, kein Fehler.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema erweitern (`CheckInSchedule`, `CheckInResponse`)

### Checkpoint: Schema
- [ ] Migration angewendet, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `computePeriodKey()` in `src/tenant/checkIns/period.ts` + Unit-Tests

### Phase 3: API
- [ ] Task 3: Schedule-Routen (`GET/POST /api/tenant/projects/[id]/check-ins`, POST nur owner/admin) + Integrationstest
- [ ] Task 4: Antwort-Route (`GET/POST /api/tenant/check-ins/[id]/responses`, POST ist upsert auf `[scheduleId, userId, periodKey]`) + Integrationstest

### Phase 4: UI
- [ ] Task 5: `/projects/[id]/check-ins/page.tsx` — fällige Check-ins beantworten, Log, Schedule-Verwaltung (owner/admin)

### Checkpoint: Abschluss
- [ ] Integrationstests grün
- [ ] `npm test` und `npm run build` grün
- [ ] Docker/curl: daily/weekly-periodKey korrekt, fällig-Status korrekt, Upsert bei Zweitantwort, 403 für member bei Schedule-Erstellung
- [ ] Review mit Mensch vor Abschluss des Moduls

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Verwechslung von Wochenschlüssel zwischen `automatic-check-ins` und `resource-planning-basic` | Niedrig | Eigene, unabhängige `computePeriodKey()`-Funktion statt Wiederverwendung von `getCurrentWeekRange` mit anderer Semantik; nur intern auf dieselbe UTC-Wochenlogik gestützt |

## Open Questions
Keine — Spec vom Menschen bestätigt.
