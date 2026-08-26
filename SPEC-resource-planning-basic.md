# Spec: resource-planning-basic

## Objective
Auslastungs-/Kapazitätsansicht pro Person über alle Projekte hinweg: für die aktuelle Woche wird pro Person die Summe der geschätzten Stunden ihrer zugewiesenen, nicht abgeschlossenen Tasks mit Fälligkeitsdatum in dieser Woche der individuellen Wochenkapazität gegenübergestellt.

**Nutzer:** Owner/Admin (Team-Auslastung im Blick behalten), aber auch normale Mitglieder (eigene Auslastung sehen).

**Erfolg:** Eine Seite zeigt für jede Person in der aktuellen Woche geplante Stunden vs. Kapazität inkl. Drill-down auf die zugrunde liegenden Tasks; Owner/Admin können die Wochenkapazität einer Person bearbeiten.

## Tech Stack
Next.js (App Router) + TypeScript + PostgreSQL + Prisma — unverändert.

## Commands
Build: `npm run build`
Test: `npm test`
Migrate (Tenant-Schema): `npm run db:tenant:migrate`
Dev: `docker compose up -d`

## Project Structure
```
prisma/tenant/schema.prisma                 → Task.estimatedHours, User.weeklyCapacityHours
src/tenant/resourcePlanning/week.ts          → reine Funktion: aktuelle Kalenderwoche (Mo-So, UTC-sicher) bestimmen
src/tenant/resourcePlanning/utilization.ts   → reine Funktion: Tasks[] + Kapazität → { plannedHours, utilizationPercent, tasks }
src/app/api/tenant/users/[id]/capacity/route.ts → PATCH weeklyCapacityHours, nur owner/admin
src/app/(tenant)/resource-planning/page.tsx  → Übersicht aller Personen, aktuelle Woche
tests/resourcePlanningWeek.test.ts
tests/resourcePlanningUtilization.test.ts
tests/resourcePlanning.test.ts               → Integrationstest gegen echte Tenant-DB
```

## Code Style
Reine Logik von DB/HTTP getrennt (bestehendes Muster):
```ts
export function computeUtilization(
  tasks: { estimatedHours: number | null }[],
  weeklyCapacityHours: number,
) {
  const plannedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const utilizationPercent = weeklyCapacityHours > 0 ? (plannedHours / weeklyCapacityHours) * 100 : 0;
  return { plannedHours, utilizationPercent };
}
```

## Testing Strategy
Vitest. `getCurrentWeekRange`/`computeUtilization` sind reine Funktionen und werden direkt unit-getestet (inkl. UTC-Randfälle wie Wochenwechsel). Die Aggregation über echte `Task`-Zeilen (zugewiesen, nicht `done`, `dueDate` in der Woche, über mehrere Projekte hinweg) wird als Integrationstest gegen eine per `provisionTenant()` erzeugte Tenant-DB getestet. Rollen-Schutz beim Kapazitäts-PATCH ebenfalls dort. Die Seite selbst wird zusätzlich manuell via Docker/curl verifiziert.

## Boundaries
- **Always:** Tasks ohne `dueDate` oder ohne `estimatedHours` fließen einfach nicht in die Summe ein — kein Fehler, keine Annahme eines Default-Werts.
- **Ask first:** Erweiterung um mehrwöchige Zeitachse/Forecast (explizit nicht Teil von v1, siehe Objective).
- **Never:** Keine automatische Neuzuweisung von Tasks bei Überlastung, keine Benachrichtigungen (das ist `notifications`).

## Success Criteria
- Person mit zwei zugewiesenen, nicht abgeschlossenen Tasks (unterschiedliche Projekte) mit `dueDate` in der laufenden Woche und `estimatedHours` von je 4 zeigt `plannedHours = 8`.
- Task ohne `dueDate` oder ohne `estimatedHours` wird nicht mitgezählt.
- Task mit `dueDate` außerhalb der laufenden Woche wird nicht mitgezählt.
- `PATCH .../capacity` durch ein `member` wird abgelehnt (403).
- Drill-down zeigt die zugrunde liegenden Tasks inkl. Projektname.

## Open Questions
Keine — Annahmen vom Menschen bestätigt ("Passt so").
