# Spec: automation-rules (v2 Modul 1)

## Objective
Owner/Admin können tenant-weite No-Code-Automationen anlegen: "Wenn [Trigger]
(optional nur bei [Bedingung]), dann [Aktion(en)]." Füllt den bisherigen
Platzhalter `Settings → Organization → Automations`.

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
prisma/tenant/schema.prisma                 → AutomationRule, AutomationAction, Enums
src/tenant/automations/runAutomations.ts    → reine Ausführungslogik (matching + Aktionen)
src/app/api/tenant/automation-rules/route.ts        → GET/POST
src/app/api/tenant/automation-rules/[id]/route.ts   → PATCH/DELETE
src/app/(tenant)/settings/organization/automations/page.tsx + AutomationsClient.tsx
tests/                                       → Unit + Integrationstest
```

## Code Style
Bestehende Muster: `canManageMembers`-Rollen-Guard, Field-Atlas-CSS,
`recordActivity()` als einziger Integrationspunkt für "etwas ist passiert"
(wie bereits bei `dispatchWebhooks`/Notification-Fanout).

## Testing Strategy
Vitest für die reine Matching-/Ausführungsfunktion (Trigger+Bedingung →
welche Aktionen laufen). Integrationstest für den kompletten
Task-erstellt/Status-geändert → Zuweisung/Notification-Flow. Docker-E2E:
Regel anlegen, Trigger auslösen, Ergebnis prüfen, 403 für member.

## Boundaries
- Always: Automations laufen aus `recordActivity()`, nicht aus einem
  separaten Cron/Poll-Mechanismus.
- Ask first: Weitere Trigger-Typen oder eine echte Bedingungs-Kette
  (AND/OR-Builder) — bewusst außerhalb des v1-Scopes dieses Moduls.
- Never: Von einer Automation ausgelöste Task-Mutationen dürfen selbst
  keine neuen `recordActivity()`-Aufrufe/Automationen auslösen (Endlosschleifen-Schutz).

## Success Criteria
- Owner/Admin kann eine Regel anlegen: Name, Trigger (`task_created` |
  `task_status_changed`), bei Status-Änderung optional eine
  Status-Kategorie-Bedingung, beliebig viele Aktionen (Zuweisen an Person /
  Person benachrichtigen).
- Beim Erstellen eines Tasks bzw. bei einer Statusänderung, die zur Regel
  passt, werden alle Aktionen der Regel ausgeführt.
- Eine deaktivierte Regel (`isEnabled=false`) läuft nicht.
- Automation-Aktionen lösen keine weiteren Automationen aus.
- 403 für `member`-Rolle bei Anlegen/Bearbeiten/Löschen.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt.
