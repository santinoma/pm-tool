# Spec: automatic-check-ins

## Objective
Wiederkehrende, automatisch gestellte Status-Fragen pro Projekt (z. B. "Was hast du diese Woche gemacht?"); Antworten landen als durchsuchbares Log, sichtbar für alle Projektbeteiligten.

**Nutzer:** Owner/Admin legen Check-in-Schedules pro Projekt an; alle Nutzer beantworten ihre fälligen Check-ins und sehen das Log.

**Erfolg:** Ein Nutzer sieht auf `/projects/[id]/check-ins` seine für die aktuelle Periode noch unbeantworteten Check-ins, kann sie beantworten, und alle bisherigen Antworten sind im Log sichtbar.

## Tech Stack
Next.js (App Router) + TypeScript + PostgreSQL + Prisma — unverändert. Kein echter Cron/Scheduler — "automatisch" bedeutet Pull-basiert: die aktuelle Periode wird bei jedem Seitenaufruf berechnet, kein Push/Reminder.

## Project Structure
```
prisma/tenant/schema.prisma                    → CheckInSchedule, CheckInResponse
src/tenant/checkIns/period.ts                  → reine Funktion: computePeriodKey(date, recurrence, dayOfWeek?)
src/app/api/tenant/projects/[id]/check-ins/route.ts       → GET/POST Schedules (POST nur owner/admin)
src/app/api/tenant/check-ins/[id]/responses/route.ts      → GET/POST Antworten (POST: eigene Antwort für die aktuelle Periode)
src/app/(tenant)/projects/[id]/check-ins/page.tsx         → fällige Check-ins beantworten + Log + Schedule-Verwaltung (owner/admin)
tests/checkInsPeriod.test.ts
tests/checkIns.test.ts                         → Integrationstest gegen echte Tenant-DB
```

## Code Style
Reine Logik von DB/HTTP getrennt (bestehendes Muster, analog zu `getCurrentWeekRange`):
```ts
export function computePeriodKey(date: Date, recurrence: "daily" | "weekly"): string {
  if (recurrence === "daily") return getUtcDateKey(date);
  const { start } = getCurrentWeekRange(date);
  return getUtcDateKey(start); // Wochenschlüssel = Montag der Woche
}
```

## Testing Strategy
Vitest. `computePeriodKey` ist eine reine Funktion, direkt unit-getestet (gleicher Tag → gleicher Key bei `daily`; verschiedene Tage derselben Woche → gleicher Key bei `weekly`). Die DB-Aggregation (fällige vs. bereits beantwortete Check-ins pro Nutzer und Periode, `@@unique([scheduleId, userId, periodKey])` verhindert Doppel-Antworten) wird als Integrationstest gegen eine per `provisionTenant()` erzeugte Tenant-DB getestet. Die Seite selbst wird zusätzlich manuell via Docker/curl verifiziert.

## Boundaries
- **Always:** Jeder Nutzer kann pro Schedule und Periode höchstens eine Antwort abgeben (DB-Unique-Constraint), aber sie danach bearbeiten (Update statt Duplikat).
- **Ask first:** Echte Cron-gesteuerte Erinnerungen/Benachrichtigungen (z. B. Anbindung an `notifications`) — bewusst nicht in v1, siehe Boundaries oben.
- **Never:** Schedules können nicht rückwirkend Antworten für vergangene, nie aktive Perioden erzeugen — nur die aktuelle Periode ist beantwortbar.

## Success Criteria
- Schedule mit `recurrence: "daily"` erzeugt für jeden Kalendertag einen eigenen `periodKey`; `recurrence: "weekly"` erzeugt für die ganze Woche denselben Key.
- Ein Nutzer ohne Antwort für die aktuelle Periode sieht das Schedule als "fällig"; nach dem Beantworten verschwindet es aus der fälligen Liste.
- Zweite Antwort derselben Person für dieselbe Periode aktualisiert die bestehende Antwort statt eine zweite anzulegen.
- `POST /api/tenant/projects/[id]/check-ins` (Schedule anlegen) durch `member` wird abgelehnt (403).
- Log zeigt alle Antworten aller Perioden, absteigend sortiert.

## Open Questions
Keine — Annahmen (inkl. projekt-gebunden statt tenant-weit) vom Menschen bestätigt.
