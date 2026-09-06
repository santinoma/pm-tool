# Implementation Plan: slack-to-issue-capture

## Overview
`SlackCaptureConfig` (tenant-weit: `signingSecret`, `defaultProjectId`,
`enabled`). Der eingehende Endpunkt prüft die Anfrage exakt nach Slacks
öffentlich dokumentiertem Verfahren (`X-Slack-Signature` = `v0=` +
HMAC-SHA256(`v0:{timestamp}:{rawBody}`, signingSecret), Timestamp
innerhalb ±5 Minuten) und legt bei Erfolg einen Task an.

## Architecture Decisions
- Eigenes Modell statt Wiederverwendung von `TenantSettings`, da
  Signing Secret + Projekt-Zuordnung ein klar abgegrenzter Baustein ist.
- Signatur-Prüfung ist eine reine Funktion über den ROHEN Request-Body
  (nicht das geparste JSON) — genau wie Slack es verlangt, sonst
  driftet die Prüfung bei abweichender JSON-Serialisierung auseinander.
- `Task.externalSourceUrl` ist bewusst generisch benannt (nicht
  `slackPermalink`), damit spätere Capture-Quellen (E-Mail, andere Chat-
  Tools) dasselbe Feld nutzen können, ohne das Datenmodell zu erweitern.
- Fällt `defaultProjectId` auf ein gelöschtes Projekt, schlägt die
  Task-Anlage mit einer klaren Fehlermeldung fehl, statt einen
  "verwaisten" Task ohne Projekt anzulegen.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `SlackCaptureConfig`, `Task.externalSourceUrl`, Migration

### Checkpoint: Schema
- [ ] Migration, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `verifySlackSignature()` + Tests (gültig/falsch/Timestamp-Toleranz)
- [ ] Task 3: `buildTaskDraft()` (Payload → Titel/Beschreibung) + Tests

### Phase 3: API
- [ ] Task 4: `POST /api/tenant/integrations/slack/capture` + Integrationstest
- [ ] Task 5: `GET`/`PATCH /api/tenant/organization/slack-capture` (nur owner/admin)

### Checkpoint: API
- [ ] Tests grün, Docker: 401 bei falscher Signatur, Task-Anlage bei gültiger

### Phase 4: UI
- [ ] Task 6: Slack-Capture-Konfiguration in Settings → Organization

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Replay-Angriff mit abgefangener, alter Signatur | Mittel | Timestamp-Toleranzfenster (±5 Min, wie bei Slack selbst) lehnt alte Requests ab |

## Open Questions
Keine.
