# Implementation Plan: time-tracking

## Overview
Timer + manuelle Zeiteinträge an Tasks, optional an Projekten (Tenant-Einstellung). Reine Berechnungs-/Validierungslogik zuerst, dann API, dann UI.

## Architecture Decisions
- **`TenantSettings` als Singleton-Zeile**, per `getOrCreateTenantSettings()` gelesen/erzeugt — kein DB-Constraint für "genau eine Zeile", Anwendungslogik stellt das sicher (Fortführung des Musters: Invarianten in Code, nicht im Schema)
- **Timer-Stop-Logik zentral in einer Funktion** (`stopRunningTimer`), die von "neuer Timer startet" UND "Timer wird explizit gestoppt" wiederverwendet wird — vermeidet doppelte Implementierung derselben Berechnung

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `TenantSettings`, `TimeEntry` ins Tenant-Schema + Migration

### Phase 2: Reine Logik
- [ ] Task 2: `duration.ts` — `computeDurationMinutes`, `aggregateByTask`, `aggregateByProject`, `validateEntryTarget` (taskId/projectId-Invariante)

### Checkpoint: Logik-Grundlagen
- [ ] Unit-Tests grün, `npm run build` grün

### Phase 3: Einstellungen & Timer
- [ ] Task 3: Tenant-Settings API + Einstellungsseite
- [ ] Task 4: Timer Start/Stop API (inkl. Auto-Stop des vorherigen Timers)

### Phase 4: Manuelle Einträge & Übersicht
- [ ] Task 5: Manuelle Zeiteinträge CRUD-API
- [ ] Task 6: Zeiterfassungs-Seite (laufender Timer, eigene Einträge, manueller Eintrag anlegen)

## Checkpoint: Abschluss
- [ ] Manuell/E2E via Docker: Timer starten → zweiter Timer stoppt ersten automatisch → manueller Eintrag → Aggregation korrekt → Projektebene-Buchung bei deaktivierter Einstellung serverseitig abgelehnt
- [ ] `npm test` und `npm run build` grün
- [ ] Review mit Mensch

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Zwei parallele Timer durch Race Condition (zwei Tabs) | Niedrig | Start-Timer-Funktion liest+stoppt+erstellt in einer Transaktion |
| Aggregation zählt Task-gebundene Einträge doppelt, wenn Task in mehreren Projekten (Cross-Tagging) auftaucht | Mittel | Aggregation pro Projekt zählt nur Tasks, bei denen dieses Projekt `isPrimary` ist — explizit in Tests abgedeckt |

## Open Questions
- Keine blockierenden
