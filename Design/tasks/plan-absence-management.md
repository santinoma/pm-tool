# Implementation Plan: absence-management

## Overview
`AbsenceRequest` (Urlaub/Krankheit, Zeitraum, Status) + Genehmigungs-Workflow.
Statt eines materialisierten "Soll erfüllt"-Datensatzes pro Tag wird die
erfüllte Soll-Zeit rein aus genehmigten `AbsenceRequest`-Zeiträumen berechnet
(Werktage × `weeklyCapacityHours / 5`) — das spätere company-time-overview-
Modul fragt das bei Bedarf ab. Vermeidet eine zusätzliche Tabelle für Daten,
die aus dem Zeitraum ableitbar sind.

## Architecture Decisions
- Reine Funktion `countBusinessDays(start, end)` (Mo–Fr) und
  `computeCreditedHours(businessDays, weeklyCapacityHours)` in
  `src/tenant/absence/businessDays.ts` — keine Feiertagslogik in v1.
- Genehmigung/Ablehnung ist ein einfaches Statusfeld-Update (kein
  `$transaction` nötig, da keine zweite Tabelle geschrieben wird).
- Zugriffsschutz: `POST` (Antrag stellen) für jeden eingeloggten User über
  sich selbst; `PATCH` (genehmigen/ablehnen) nur für `canManageMembers(role)`.
- `GET` liefert eigene Anträge; Admin/Owner erhalten zusätzlich `?all=true`
  für die Genehmigungs-Queue (alle `pending`-Anträge im Tenant).

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `AbsenceRequest`-Modell + Enums, Migration

### Checkpoint: Schema
- [ ] Migration angewendet, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `countBusinessDays()` + `computeCreditedHours()` + Tests

### Phase 3: API
- [ ] Task 3: `POST /api/tenant/absence-requests` (Antrag stellen) + `GET` (eigene/`?all=true` für Admin)
- [ ] Task 4: `PATCH /api/tenant/absence-requests/[id]` (genehmigen/ablehnen, nur Admin/Owner) + Integrationstest

### Checkpoint: API
- [ ] `npm test` grün, Docker: 403 für member bei PATCH

### Phase 4: UI
- [ ] Task 5: `/time/absence` — Antragsformular + eigene Anträge (ersetzt Platzhalter aus time-tracking-v2)
- [ ] Task 6: Genehmigungs-Queue für Admin/Owner auf derselben Seite

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Überlappende Anträge (Doppelbuchung) | Niedrig | v1: keine Überlappungsprüfung, kann bei Bedarf nachgezogen werden |

## Open Questions
Keine.
