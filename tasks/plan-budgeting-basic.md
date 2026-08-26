# Implementation Plan: budgeting-basic

## Overview
Einfaches Soll-/Ist-Budget pro Projekt (Stunden + optional Betrag via flachem Stundensatz). Baut direkt auf dem bestehenden `TimeEntry`-Modell aus `time-tracking` auf; keine neuen Fremd-Abhängigkeiten.

## Architecture Decisions
- Budget-Felder leben direkt auf `Project` (keine eigene Tabelle) — es sind drei einfache nullable Skalare, keine eigene Entität rechtfertigt sich.
- `currency` landet auf der bestehenden `TenantSettings`-Singleton-Zeile (analog zu `allowProjectLevelTimeEntries`), nicht pro Projekt.
- Aggregation wird als reine Funktion (`computeBudgetStatus`) implementiert und nimmt bereits geladene `TimeEntry`-Zeilen entgegen — die DB-Query (inkl. primärer Task→Projekt-Zuordnung) wird in der Route zusammengestellt, wiederverwendet aus dem bestehenden `time-tracking`-Aggregationsmuster.
- Rollen-Schutz für PATCH nutzt das bestehende Rollen-Enum (`owner`/`admin`/`member`) und die bereits vorhandene Session/Rollen-Prüfung aus `identity-org`.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema erweitern (`Project.budgetHours`, `Project.budgetAmount`, `Project.hourlyRate`, `TenantSettings.currency`)

### Checkpoint: Schema
- [ ] Migration wendet sich an, `npm run build` bleibt grün

### Phase 2: Reine Logik
- [ ] Task 2: `computeBudgetStatus()` in `src/tenant/budgeting/aggregate.ts` + Unit-Tests

### Phase 3: API + UI
- [ ] Task 3: `GET/PATCH /api/tenant/projects/[id]/budget` (PATCH nur owner/admin)
- [ ] Task 4: `/projects/[id]/budget/page.tsx` — Anzeige Soll/Ist + Bearbeitungsformular

### Checkpoint: Abschluss
- [ ] Integrationstest (`tests/budgeting.test.ts`) grün
- [ ] `npm test` und `npm run build` grün
- [ ] Docker/curl: Budget setzen, Ist-Werte korrekt (inkl. Task-gebundene Zeiteinträge über primäres Projekt), 403 für member bei PATCH
- [ ] Review mit Mensch vor Abschluss des Moduls

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Doppelzählung von Zeiteinträgen (Task- und Projekt-gebunden) | Mittel | Aggregation zählt Task-Einträge nur über die primäre `TaskProject`-Verknüpfung — bereits etabliertes Muster aus `time-tracking` |
| Rollen-Prüfung vergessen bei PATCH | Hoch | Expliziter Integrationstest für 403 bei `member` |

## Open Questions
Keine — Spec vom Menschen bestätigt.
