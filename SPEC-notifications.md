# Spec: notifications

## Objective
Ein Aktivitäts-Feed pro Projekt (chronologisches Ereignis-Log, für alle Projektmitglieder sichtbar) plus ein persönliches, in-app Benachrichtigungs-Postfach, gesteuert durch granulare, pro-Projekt einstellbare Präferenzen (`all`/`mentions`/`off`), inklusive Broadcast-Mentions (`@channel`-Äquivalent).

**Nutzer:** Alle Tenant-Nutzer — sehen den Aktivitäts-Feed ihrer Projekte und verwalten ihre eigenen Benachrichtigungs-Einstellungen und ihr Postfach.

**Erfolg:** Ereignisse (Task erstellt/Status geändert, Kommentar, Anhang, Wiki-Seite) erscheinen im Projekt-Feed; Nutzer mit Präferenz `all` erhalten für jedes Ereignis eine persönliche Benachrichtigung (außer für ihre eigenen Aktionen), Nutzer mit `mentions` nur bei individueller oder Broadcast-Erwähnung, Nutzer mit `off` nie.

## Tech Stack
Next.js (App Router) + TypeScript + PostgreSQL + Prisma — unverändert. Kein E-Mail-/Push-Versand, rein in-app.

## Project Structure
```
prisma/tenant/schema.prisma                    → ActivityEvent, NotificationPreference, Notification
src/tenant/notifications/broadcast.ts          → reine Funktion: enthält Text ein @channel-Token?
src/tenant/notifications/fanout.ts             → reine Funktion: welche User (aus Mitgliederliste + Präferenzen + Mentions) bekommen eine Notification für ein Ereignis?
src/tenant/notifications/recordActivity.ts     → DB-Helper: legt ActivityEvent an + fanout zu Notification-Zeilen
src/app/api/tenant/projects/[id]/activity/route.ts       → GET Feed
src/app/api/tenant/projects/[id]/notification-preference/route.ts → GET/PATCH eigene Präferenz
src/app/api/tenant/notifications/route.ts      → GET eigenes Postfach
src/app/api/tenant/notifications/[id]/read/route.ts → PATCH als gelesen markieren
src/app/(tenant)/projects/[id]/activity/page.tsx
src/app/(tenant)/notifications/page.tsx
tests/notificationsBroadcast.test.ts
tests/notificationsFanout.test.ts
tests/notifications.test.ts                    → Integrationstest gegen echte Tenant-DB
```

## Code Style
Reine Logik von DB/HTTP getrennt (bestehendes Muster):
```ts
export function hasBroadcastMention(text: string): boolean {
  return /(^|\s)@channel(\s|$)/.test(text);
}

export type PreferenceLevel = "all" | "mentions" | "off";

export function shouldNotify(
  level: PreferenceLevel,
  isActor: boolean,
  isIndividuallyMentioned: boolean,
  isBroadcastMentioned: boolean,
): boolean {
  if (isActor) return false;
  if (level === "off") return false;
  if (level === "all") return true;
  return isIndividuallyMentioned || isBroadcastMentioned;
}
```

## Testing Strategy
Vitest. `hasBroadcastMention` und `shouldNotify` sind reine Funktionen, direkt unit-getestet (alle Präferenz-/Mention-Kombinationen). Der DB-Helper `recordActivity()` (ActivityEvent anlegen + Fanout zu Notification-Zeilen über die tatsächliche Mitgliederliste eines Projekts) wird als Integrationstest gegen eine per `provisionTenant()` erzeugte Tenant-DB getestet. Die Routen selbst werden zusätzlich manuell via Docker/curl verifiziert (Feed-Reihenfolge, Präferenz-Wechsel, ungelesen/gelesen).

## Boundaries
- **Always:** Der Aktivitäts-Feed selbst ist ungefiltert und für alle Projektmitglieder sichtbar — Präferenzen filtern nur, wer eine *persönliche Notification* bekommt, nicht den Feed.
- **Ask first:** Erweiterung um E-Mail-/Push-Versand (explizit nicht Teil dieses Moduls).
- **Never:** Keine Benachrichtigung für die eigene Aktion (kein Nutzer bekommt eine Notification für ein Ereignis, das er selbst ausgelöst hat); `off` wird nie übersteuert, auch nicht durch `@channel`.

## Success Criteria
- Ereignis (z. B. Kommentar) erzeugt einen `ActivityEvent`-Eintrag im Projekt-Feed.
- Nutzer mit Präferenz `all` erhält eine `Notification` für ein Ereignis eines anderen Nutzers im selben Projekt, aber keine für sein eigenes Ereignis.
- Nutzer mit Präferenz `mentions` erhält nur bei individueller `@email`-Erwähnung oder `@channel`-Broadcast eine `Notification`, sonst nicht.
- Nutzer mit Präferenz `off` erhält nie eine `Notification`, auch nicht bei `@channel`.
- `@channel` in einem Kommentar erzeugt Notifications für alle Projektmitglieder mit `all`/`mentions`, aber keine für Mitglieder mit `off`.
- Eigene Präferenz ist über die API änderbar (`GET`/`PATCH`), Default ist `all`.
- Postfach zeigt ungelesene/gelesene Notifications, `PATCH .../read` markiert eine als gelesen.

## Open Questions
Keine — Annahmen vom Menschen bestätigt ("Passt so").
