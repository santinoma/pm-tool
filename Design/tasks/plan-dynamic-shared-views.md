# Implementation Plan: dynamic-shared-views

## Overview
`SharedView` pro Projekt (Token, optionaler Status-Kategorie-Filter,
optionales Ablaufdatum, `revokedAt`). Die öffentliche Route
`/shared/[token]` lädt ausschließlich über das Token, ohne jede
Session-/Cookie-Prüfung, und rendert eine eigene schlanke,
schreibgeschützte Tabelle.

## Architecture Decisions
- Token wird wie bei `generateInviteToken()` als zufälliger Hex-String
  erzeugt — gleiches Sicherheitsniveau (unratbar) wie Invite-Tokens.
- Gültigkeitsprüfung (`isSharedViewValid()`) ist eine reine Funktion
  (revoked/expired), getrennt von der DB-Abfrage — leicht testbar.
- Die öffentliche Seite liegt bewusst unter `(tenant)/shared/[token]`
  (nicht `(tenant)/projects/...`), damit sie strukturell erkennbar
  getrennt von den eingeloggten Bereichen bleibt.
- Keine Wiederverwendung der vollen `ListClient`/`BoardClient`-
  Komponenten — eine neue, rein lesende Tabellen-Komponente ohne
  Drag&Drop/Edit-Handler.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `SharedView`-Modell, Migration

### Checkpoint: Schema
- [ ] Migration, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `isSharedViewValid()` (revoked/expired) + Tests

### Phase 3: API
- [ ] Task 3: `GET`/`POST /api/tenant/projects/[id]/shared-views` (nur owner/admin)
- [ ] Task 4: `PATCH /api/tenant/shared-views/[id]` (revoke) + Integrationstest

### Checkpoint: API
- [ ] Tests grün, Docker: 403 für member, 410 nach Widerruf

### Phase 4: UI
- [ ] Task 5: Freigabe-Panel auf `/projects/[id]/list` (Links erstellen/anzeigen/widerrufen)
- [ ] Task 6: `/shared/[token]` öffentliche schreibgeschützte Ansicht

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Token in Logs/Referrer geleakt | Niedrig-Mittel (v1-Scope) | Kein zusätzlicher Schutz in v1, als Grenze dokumentiert; Widerruf jederzeit möglich |

## Open Questions
Keine.
