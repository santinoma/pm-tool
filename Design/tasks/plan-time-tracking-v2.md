# Implementation Plan: time-tracking-v2

## Overview
Tab-Shell für `/time`, ein Tenant-Modus-Schalter, und eine neue Kalender+Modal-Oberfläche für Zeiteinträge, die Budget-Sections direkt belastet.

## Architecture Decisions
- `budgetUsed`-Erhöhung passiert in derselben Transaktion wie die `TimeEntry`-Erstellung (Prisma `$transaction`), damit Eintrag und Budget-Belastung nie inkonsistent auseinanderlaufen.
- Der Stundensatz wird beim Anlegen aus der Section kopiert in `TimeEntry.amount` (nicht live neu berechnet bei jeder Anzeige) — historische Korrektheit, falls sich der Section-Preis später ändert.
- Zugriffsschutz (nur zugeordnete Personen dürfen buchen) wird server-seitig in der Route geprüft, nicht nur im Dropdown ausgeblendet — Client-seitiges Ausblenden ist UX, kein Security-Kontrollpunkt.
- Kalender ist eine einfache eigene Komponente (Wochenraster, Stunden als Zeilen, Tage als Spalten), kein Wiederverwenden der bestehenden Projekt-Kalender-Komponente (andere Datenquelle: eigene Zeiteinträge statt Task-Fälligkeiten).

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema erweitern (`TenantSettings.timeTrackingMode`, `TimeEntry.budgetSectionId` + `amount`)

### Checkpoint: Schema
- [ ] Migration angewendet, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `computeEntryCost()` + Unit-Tests

### Phase 3: API
- [ ] Task 3: `POST /api/tenant/time-entries` erweitert um Section-Pfad (Transaktion, Zugriffsschutz) + Integrationstest
- [ ] Task 4: `PATCH /api/tenant/tenant-settings` erweitert um `timeTrackingMode`

### Phase 4: UI
- [ ] Task 5: Tab-Shell `/time` (Meine Zeit / Book Absence-Platzhalter / Company Time-Platzhalter)
- [ ] Task 6: `MeineZeitTab` — Modus-Weiche
- [ ] Task 7: Wochenkalender + "New time entry"-Modal
- [ ] Task 8: Modus-Auswahl in Settings → Organisation

### Checkpoint: Abschluss
- [ ] Integrationstest grün
- [ ] `npm test` und `npm run build` grün
- [ ] Docker/curl: Eintrag anlegen erhöht `budgetUsed` korrekt, Zugriffsschutz greift, Modus-Umschaltung funktioniert
- [ ] Review mit Mensch vor Abschluss des Moduls

## Open Questions
Keine — Spec vom Menschen bestätigt.
