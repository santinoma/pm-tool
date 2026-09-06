# Implementation Plan: projects-nav-v2

## Overview
Nav-Trennung (Meine Tasks / Projekte), Fortschritts-Spalte in der Projekt-Liste, direktes Task-Anlegen per Button, und eine neue Tenant-Einstellung, die Triage optional macht.

## Architecture Decisions
- `triageEnabled` lebt auf `TenantSettings` (Singleton, bestehendes Muster von `allowProjectLevelTimeEntries`/`currency`) statt auf `Project` — Triage ist eine organisatorische Entscheidung des ganzen Tenants, nicht pro Projekt.
- Die Entscheidungslogik "landet ein neuer Task in Triage?" wird in eine reine, einzeilige Funktion ausgelagert (`resolveInitialTriageState`), damit sie nicht implizit in der Route verstreut ist und ein Unit-Test sie direkt abdeckt.
- "Meine Tasks" wiederverwendet die bestehende `LegendKey`-Komponente und das Tabellen-Layout aus dem projekt-internen List-View, filtert aber cross-projekt auf `assigneeId`.
- Die Fortschritts-Spalte in der Projekt-Liste nutzt die bereits vorhandene `computeProgress()`-Funktion (aus `reporting-dashboards`), keine neue Aggregationslogik.
- `ProjectSubnav` bekommt einen neuen optionalen Prop `showTriage: boolean` (default `true` wenn nicht übergeben, um bestehende Aufrufe nicht zu brechen) statt selbst Tenant-Settings zu laden — Server-Komponente (`layout.tsx`) lädt die Einstellung einmal und reicht sie durch.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema erweitern (`TenantSettings.triageEnabled`)

### Checkpoint: Schema
- [ ] Migration angewendet, `npm run build` grün

### Phase 2: Reine Logik + Route-Anpassung
- [ ] Task 2: `resolveInitialTriageState()` + Unit-Test
- [ ] Task 3: `POST /api/tenant/tasks` respektiert `triageEnabled`; `PATCH /api/tenant/tenant-settings` erweitert um `triageEnabled` + Integrationstest

### Phase 3: Navigation + Seiten
- [ ] Task 4: Sidebar-Split (Meine Tasks / Projekte) in `AppShell`
- [ ] Task 5: `/my-tasks`-Seite
- [ ] Task 6: Fortschritts-Spalte in `/projects`
- [ ] Task 7: Triage-Toggle in `/settings/organization`; `ProjectSubnav` blendet Triage-Tab bedingt aus
- [ ] Task 8: "Neuer Task"-Inline-Formular in List- und Board-View

### Checkpoint: Abschluss
- [ ] Integrationstest grün
- [ ] `npm test` und `npm run build` grün
- [ ] Docker/curl: Meine-Tasks-Filter korrekt, Fortschritts-Spalte korrekt, Triage-Toggle wirkt auf Task-Erstellung und Subnav, Neuer-Task-Button funktioniert in beiden Views
- [ ] Review mit Mensch vor Abschluss des Moduls

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Bestehende Tenants sehen plötzlich anderes Verhalten | Hoch, falls falsch defaulted | `triageEnabled` default `true` — exakt bisheriges Verhalten, explizit getestet |
| ProjectSubnav-Änderung bricht bestehende Aufrufer (keine `showTriage`-Prop übergeben) | Niedrig | Prop optional mit Default `true` |

## Open Questions
Keine — Spec vom Menschen bestätigt.
