# Spec: reporting-dashboards

## Objective
Zwei vordefinierte Reports (überfällige Tasks, Projekt-Fortschritt) plus ein persönliches Dashboard mit einem festen Katalog anpassbarer Widgets (an/aus, Reihenfolge), das bestehende Module (Projekte/Tasks, Zeiterfassung/Ressourcenplanung, Budget) zusammenführt.

**Nutzer:** Alle Tenant-Nutzer.

**Erfolg:** `/reports/overdue` zeigt alle überfälligen Tasks cross-projekt; `/reports/progress` zeigt Fortschritt pro Projekt; `/dashboard` zeigt die vom Nutzer gewählten Widgets in seiner gewählten Reihenfolge.

## Tech Stack
Next.js (App Router) + TypeScript + PostgreSQL + Prisma — unverändert.

## Project Structure
```
prisma/tenant/schema.prisma                          → DashboardWidgetPreference
src/tenant/reporting/overdue.ts                       → reine Funktion: Tasks[] → überfällige Tasks (dueDate < now, nicht done)
src/tenant/reporting/progress.ts                      → reine Funktion: Tasks[] (mit Status-Kategorie) → Fortschritt in %
src/tenant/reporting/widgets.ts                       → Katalog-Konstante (Typen, Default-Reihenfolge) + reine Merge-Funktion (Default-Katalog + gespeicherte Präferenzen)
src/app/api/tenant/reports/overdue/route.ts
src/app/api/tenant/reports/progress/route.ts
src/app/api/tenant/dashboard/widgets/route.ts         → GET/PATCH eigene Widget-Präferenzen
src/app/(tenant)/reports/overdue/page.tsx
src/app/(tenant)/reports/progress/page.tsx
src/app/(tenant)/dashboard/page.tsx
tests/reportingOverdue.test.ts
tests/reportingProgress.test.ts
tests/reportingWidgets.test.ts
tests/reportingDashboards.test.ts                     → Integrationstest gegen echte Tenant-DB
```

## Code Style
Reine Logik von DB/HTTP getrennt (bestehendes Muster):
```ts
export function computeProgress(tasks: { statusCategory: "not_started" | "started" | "done" }[]) {
  if (tasks.length === 0) return { done: 0, total: 0, percent: 0 };
  const done = tasks.filter((t) => t.statusCategory === "done").length;
  return { done, total: tasks.length, percent: Math.round((done / tasks.length) * 100) };
}
```

## Testing Strategy
Vitest. `computeOverdueTasks`, `computeProgress` und die Katalog-Merge-Funktion sind reine Funktionen, direkt unit-getestet. Die tatsächliche DB-Aggregation (Tasks über mehrere Projekte, Ausschluss von Triage-Tasks, Speichern/Lesen von Widget-Präferenzen) wird als Integrationstest gegen eine per `provisionTenant()` erzeugte Tenant-DB getestet. Die Seiten selbst werden zusätzlich manuell via Docker/curl verifiziert.

## Boundaries
- **Always:** Triage-Tasks (`inTriage: true`) fließen nicht in Fortschritts- oder Überfälligkeits-Reports ein — sie sind noch nicht aktiv eingeplant (Konsistenz mit der bestehenden Zeiterfassungs-Seite).
- **Ask first:** Erweiterung um nutzerdefinierte/freie Widgets (explizit nicht Teil von v1, siehe Objective).
- **Never:** Keine automatisierten E-Mail-Reports/Exports (das wäre ein eigenes Modul).

## Success Criteria
- Task mit `dueDate` in der Vergangenheit und Status-Kategorie ≠ `done` erscheint im Overdue-Report; ein Task mit `dueDate` in der Zukunft oder Status `done` erscheint nicht.
- Progress-Report zeigt für ein Projekt mit 2 `done`- und 2 `not_started`-Tasks `50%`.
- Dashboard zeigt standardmäßig alle Katalog-Widgets in der Default-Reihenfolge; Deaktivieren eines Widgets entfernt es aus der eigenen Ansicht; Reihenfolge ist persistent pro Nutzer.
- Triage-Tasks werden in keinem der beiden Reports gezählt.

## Open Questions
Keine — Annahmen vom Menschen bestätigt ("Passt so").
