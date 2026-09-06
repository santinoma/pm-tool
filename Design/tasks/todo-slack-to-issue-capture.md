# Task List: slack-to-issue-capture

Siehe `tasks/plan-slack-to-issue-capture.md` und `SPEC-slack-to-issue-capture.md`.

## Phase 1: Datenmodell
- [x] Task 1: `SlackCaptureConfig`, `Task.externalSourceUrl`, Migration

## Phase 2: Reine Logik
- [x] Task 2: `verifySlackSignature()` + Tests
- [x] Task 3: `buildTaskDraft()` + Tests

## Phase 3: API
- [x] Task 4: `POST /api/tenant/integrations/slack/capture` + Integrationstest
- [x] Task 5: Konfigurations-Routen

## Phase 4: UI
- [x] Task 6: Slack-Capture-Konfiguration in Settings → Organization

## Checkpoint: Abschluss
- [x] Success-Criteria verifiziert, Tests+Build grün, Docker-Verifikation, Review

### Docker-E2E-Verifikation (2026-08-26)
- Tenant provisioniert, Projekt + Slack-Capture-Config (via `PATCH /api/tenant/organization/slack-capture`) angelegt.
- Korrekt signierter Capture-Request → 201, Task erstellt mit erwartetem Titel/Description/`externalSourceUrl`.
- Falsch signierter Request → 401.
- Deaktivierte Config → 403.
- Tenant anschließend über `DELETE /api/tenants/[id]` bereinigt.

### Hinweis: Testbarkeitsgrenze
Es existiert kein echter Slack-Workspace in dieser Umgebung. Der HMAC-Signaturalgorithmus (`v0=`-Schema) ist jedoch öffentlich dokumentiert und wurde vollständig eigenständig verifiziert (siehe `tests/verifySlackSignature.test.ts` — die erwartete Signatur wird im Test unabhängig via `node:crypto` berechnet, nicht über die zu testende Funktion selbst). Ein echter Slack-Slash-Command müsste denselben Header-Vertrag (`x-slack-request-timestamp`, `x-slack-signature`) erfüllen.
