# Implementation Plan: notifications

## Overview
Aktivitäts-Feed pro Projekt + persönliches Notification-Postfach, gesteuert durch pro-Projekt-Präferenzen und Broadcast-Mentions.

## Architecture Decisions
- Diese App hat kein separates Projekt-Mitgliedschafts-Modell (jeder Tenant-Nutzer sieht bereits alle Projekte, siehe `/projects`, `/members`) — "Projektmitglieder" für den Fanout bedeutet daher: alle `User`-Zeilen des Tenants. Kein neues Membership-Modell nötig.
- `ActivityEvent` ist ein einfaches, flaches Log (kein Event-Sourcing/Queue) — wird synchron innerhalb der bestehenden Mutation-Routen erzeugt, über einen gemeinsamen `recordActivity()`-Helper (analog zum bestehenden `getOrCreateTenantSettings()`-Muster).
- `NotificationPreference` fehlt für einen (User, Projekt) → Default `all` (nicht als DB-Zeile materialisiert, sondern als Fallback in der Fanout-Logik) — vermeidet, dass für jeden Nutzer bei jedem Projekt sofort eine Zeile angelegt werden muss.
- Broadcast-Erkennung (`@channel`) ist eine reine Regex-Funktion, unabhängig von `extractMentionedEmails` (kollidiert nicht, da `@channel` kein gültiges E-Mail-Muster ist).

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema erweitern (`ActivityEvent`, `NotificationPreference`, `Notification`)

### Checkpoint: Schema
- [ ] Migration angewendet, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `hasBroadcastMention()` in `src/tenant/notifications/broadcast.ts` + Unit-Tests
- [ ] Task 3: `shouldNotify()` in `src/tenant/notifications/fanout.ts` + Unit-Tests

### Phase 3: DB-Helper + Integration in bestehende Routen
- [ ] Task 4: `recordActivity()` in `src/tenant/notifications/recordActivity.ts` (legt `ActivityEvent` an + Fanout zu `Notification`-Zeilen über alle Tenant-User) + Integrationstest
- [ ] Task 5: Aufruf von `recordActivity()` aus bestehenden Routen: Task erstellen/Status ändern, Kommentar erstellen (inkl. Broadcast-Erkennung), Anhang erstellen, Wiki-Seite erstellen/bearbeiten

### Phase 4: API + UI
- [ ] Task 6: Feed-Route (`GET /api/tenant/projects/[id]/activity`) + Feed-Seite
- [ ] Task 7: Präferenz-Route (`GET/PATCH /api/tenant/projects/[id]/notification-preference`)
- [ ] Task 8: Postfach-Route (`GET /api/tenant/notifications`, `PATCH /api/tenant/notifications/[id]/read`) + Postfach-Seite

### Checkpoint: Abschluss
- [ ] Integrationstests grün
- [ ] `npm test` und `npm run build` grün
- [ ] Docker/curl: Feed zeigt Ereignisse, Präferenz `all`/`mentions`/`off` steuert Postfach korrekt, `@channel` erreicht alle außer `off`, eigene Aktion erzeugt keine Notification für sich selbst
- [ ] Review mit Mensch vor Abschluss des Moduls

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Fanout an alle Tenant-User bei jedem Ereignis wird bei vielen Nutzern teuer | Niedrig (kleine Teams laut Produktannahme) | Für v1 akzeptabel; spätere Optimierung (Batch-Insert) möglich, kein Redesign nötig |
| Broadcast-Regex erkennt `@channel` versehentlich als Teil eines anderen Worts (z. B. `foo@channel.com`) | Mittel | Regex verlangt Wortgrenze/Leerzeichen vor und nach `@channel`, Test für diesen Fall |

## Open Questions
Keine — Spec vom Menschen bestätigt.
