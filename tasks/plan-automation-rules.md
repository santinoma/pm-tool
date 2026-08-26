# Implementation Plan: automation-rules

## Overview
`AutomationRule` (tenant-weit, Trigger + optionale Status-Kategorie-Bedingung)
mit geordneten `AutomationAction`-Einträgen. Ausführung passiert synchron
innerhalb von `recordActivity()`, direkt nach dem bestehenden
Notification-Fanout und `dispatchWebhooks()`-Aufruf.

## Architecture Decisions
- `RecordActivityInput` bekommt zwei neue optionale Felder: `taskId` und
  `statusCategory` (nur bei `task_status_changed` gesetzt) — beide werden
  nur für das Automation-Matching gebraucht, nicht für Notifications/Webhooks.
- `runAutomations()` ist eine eigene, von `recordActivity()` aufgerufene
  Funktion; sie mutiert Tasks direkt über `tenantDb.task.update()` und
  erzeugt Notifications direkt über `tenantDb.notification.create()` — sie
  ruft NIE `recordActivity()` erneut auf (Endlosschleifen-Schutz laut Spec).
- Bedingung ist bewusst ein einzelnes optionales Feld (`conditionStatusCategory`)
  auf `AutomationRule`, keine separate Bedingungs-Tabelle — v1-Scope wie
  in den bestätigten Annahmen.
- Aktionen sind eine eigene Tabelle (`AutomationAction`) mit `position` für
  die Ausführungsreihenfolge, da eine Regel mehrere Aktionen haben kann.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `AutomationRule` + `AutomationAction` + Enums (`AutomationTrigger`, `AutomationActionType`), Migration

### Checkpoint: Schema
- [ ] Migration, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `runAutomations()` (Matching + Aktions-Ausführung) + Tests

### Phase 3: API
- [ ] Task 3: `recordActivity()` erweitert um `taskId`/`statusCategory`, ruft `runAutomations()` auf
- [ ] Task 4: `GET`/`POST /api/tenant/automation-rules`, `PATCH`/`DELETE /api/tenant/automation-rules/[id]` (nur owner/admin) + Integrationstest

### Checkpoint: API
- [ ] Tests grün, Docker: 403 für member

### Phase 4: UI
- [ ] Task 5: `/settings/organization/automations` — Regel-Liste + Anlegen/Bearbeiten/Löschen-Formular

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Automation-Kette löst versehentlich weitere Automationen aus | Hoch (Endlosschleife) | `runAutomations()` mutiert nie über `recordActivity()`, sondern direkt über Prisma |

## Open Questions
Keine.
