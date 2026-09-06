# Implementation Plan: reporting-dashboards

## Overview
Zwei feste Report-Seiten (überfällig, Fortschritt) plus ein Dashboard, das einen festen Widget-Katalog zusammenführt und pro Nutzer an/aus + Reihenfolge speichert. Fasst Daten aus `projects-tasks`, `time-tracking`/`resource-planning-basic` und `budgeting-basic` zusammen, ohne deren bestehende Seiten zu verändern.

## Architecture Decisions
- Reports sind reine Lesepfade — keine neuen Mutationen, keine Interaktion mit `notifications` (bewusst getrennt, kein Report-Digest-Versand in v1).
- Der Widget-Katalog ist eine feste TypeScript-Konstante (Typ, Label, Default-Position); `DashboardWidgetPreference` speichert nur Abweichungen vom Default (enabled/position) pro Nutzer — fehlt eine Zeile, gilt der Katalog-Default.
- Auslastungs- und Budget-Widgets rufen die bereits vorhandenen reinen Funktionen (`computeUtilization`, `computeBudgetStatus`) wieder, keine Duplizierung der Aggregationslogik.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema erweitern (`DashboardWidgetPreference`)

### Checkpoint: Schema
- [ ] Migration angewendet, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `computeOverdueTasks()` in `src/tenant/reporting/overdue.ts` + Unit-Tests
- [ ] Task 3: `computeProgress()` in `src/tenant/reporting/progress.ts` + Unit-Tests
- [ ] Task 4: Widget-Katalog + Merge-Funktion in `src/tenant/reporting/widgets.ts` + Unit-Tests

### Phase 3: API + UI
- [ ] Task 5: Report-Routen + Seiten (`/reports/overdue`, `/reports/progress`)
- [ ] Task 6: Dashboard-Widget-Präferenz-Route (`GET/PATCH /api/tenant/dashboard/widgets`) + Integrationstest
- [ ] Task 7: Dashboard-Seite (`/dashboard`), rendert Widgets gemäß Präferenz, inkl. An/Aus + Reihenfolge-Steuerung

### Checkpoint: Abschluss
- [ ] Integrationstest grün
- [ ] `npm test` und `npm run build` grün
- [ ] Docker/curl: Overdue-Report korrekt (Triage ausgeschlossen), Progress-Report korrekt, Dashboard-Präferenzen persistent
- [ ] Review mit Mensch vor Abschluss des Moduls

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Zeitzonen-Fehler bei "überfällig" (dueDate vs. now) | Niedrig | Einfacher Vergleich `dueDate < now`, kein Wochen-/Kalender-Bezug nötig (anders als resource-planning) |
| Budget-Widget zeigt für Projekte ohne Budget leere/verwirrende Werte | Niedrig | Widget blendet Projekte ohne gesetztes Budget einfach aus, kein Fehlerzustand |

## Open Questions
Keine — Spec vom Menschen bestätigt.
