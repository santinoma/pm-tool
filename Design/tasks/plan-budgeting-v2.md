# Implementation Plan: budgeting-v2

## Overview
Neues Datenmodell (Budget → BudgetSection → zugeordnete Personen), ein neuer tenant-weiter "Financials"-Bereich, reine Berechnungslogik für Total/Remaining/Usage%.

## Architecture Decisions
- `Budget` gehört zu genau einem `Project`; `BudgetSection` gehört zu genau einem `Budget`. Zugeordnete Personen als eigene Join-Tabelle `BudgetSectionAssignee` (many-to-many User↔Section).
- `budgetUsed` ist ein gespeichertes, editierbares Feld (kein computed value) — bewusst einfach für dieses Modul, spätere Automatisierung folgt in `time-tracking-v2`.
- Financials bekommt einen eigenen Sidebar-Eintrag (nicht im Projekt-Subnav), da Budgets projektübergreifend verwaltet werden und mehrere pro Projekt existieren können — ein Tab im Projekt-Subnav würde das "mehrere Budgets pro Projekt" schlecht abbilden.
- Bestehendes `budgeting-basic` (Flat-Rate auf `Project`, `/projects/[id]/budget`) bleibt unverändert im Code, wird aber nicht mehr von Financials aus verlinkt — bewusst nicht gelöscht (Boundary in der Spec).

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema erweitern (`Budget`, `BudgetSection`, `BudgetSectionAssignee`)

### Checkpoint: Schema
- [ ] Migration angewendet, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `computeSectionTotals()` + Unit-Tests

### Phase 3: API
- [ ] Task 3: Budget-Routen (`GET/POST /api/tenant/budgets`, `PATCH/DELETE /api/tenant/budgets/[id]`)
- [ ] Task 4: Section-Routen (`GET/POST /api/tenant/budgets/[id]/sections`, `PATCH/DELETE /api/tenant/budget-sections/[id]`) + Integrationstest

### Phase 4: UI
- [ ] Task 5: Sidebar-Eintrag "Financials"; Projekt-Auswahl-Seite
- [ ] Task 6: Budget-Liste + Anlegen pro Projekt
- [ ] Task 7: Section-Tabelle (Anlegen, inline editierbar, Personen-Zuordnung, Total/Remaining/Usage%-Anzeige)

### Checkpoint: Abschluss
- [ ] Integrationstest grün
- [ ] `npm test` und `npm run build` grün
- [ ] Docker/curl: Budget+Section anlegen, bearbeiten, Berechnung korrekt, Personen-Zuordnung persistiert
- [ ] Review mit Mensch vor Abschluss des Moduls

## Open Questions
Keine — Spec vom Menschen bestätigt.
