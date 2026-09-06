# Spec: budgeting-v2

## Objective
Mehrere Budgets pro Projekt, verwaltet über einen neuen, tenant-weiten "Financials"-Bereich (nicht mehr im Projekt-Subnav). Jedes Budget hat einen Titel, einen Owner und beliebig viele Sections/Services (Team-Zuordnung, geplante Zeit, Quantity, Price, Total/Used/Remaining/Usage%). Löst das einfache Flat-Rate-Budget aus `budgeting-basic` ab.

**Nutzer:** Owner/Admin (Budgets/Sections anlegen und bearbeiten); alle Nutzer (Ansicht).

**Erfolg:** Unter "Financials" wählt man ein Projekt, sieht dessen Budgets, kann ein neues Budget mit Titel+Owner anlegen, darin Sections hinzufügen (Name, zugeordnete Personen, geplante Zeit, Quantity, Price) und jede Section nachträglich bearbeiten; Total/Remaining/Usage% werden korrekt berechnet.

## Tech Stack
Next.js (App Router) + TypeScript + PostgreSQL + Prisma — unverändert.

## Project Structure
```
prisma/tenant/schema.prisma                     → Budget, BudgetSection, BudgetSectionAssignee (Join)
src/tenant/budgetingV2/sectionMath.ts            → reine Funktionen: total/remaining/usagePercent
src/app/api/tenant/budgets/route.ts              → GET (nach projectId) / POST
src/app/api/tenant/budgets/[id]/route.ts         → PATCH (Titel/Owner) / DELETE
src/app/api/tenant/budgets/[id]/sections/route.ts        → GET/POST
src/app/api/tenant/budget-sections/[id]/route.ts         → PATCH/DELETE
src/app/(tenant)/financials/page.tsx             → Projekt-Auswahl
src/app/(tenant)/financials/[projectId]/page.tsx → Budget-Liste + Anlegen für dieses Projekt
src/app/(tenant)/financials/[projectId]/[budgetId]/page.tsx → Sections-Tabelle, editierbar
tests/budgetSectionMath.test.ts
tests/budgetingV2.test.ts                        → Integrationstest gegen echte Tenant-DB
```

## Code Style
Reine Berechnung, analog zum bestehenden `computeBudgetStatus`-Muster:
```ts
export function computeSectionTotals(section: {
  quantity: number;
  price: number;
  budgetUsed: number;
}) {
  const budgetTotal = section.quantity * section.price;
  const budgetRemaining = budgetTotal - section.budgetUsed;
  const usagePercent = budgetTotal > 0 ? (section.budgetUsed / budgetTotal) * 100 : 0;
  return { budgetTotal, budgetRemaining, usagePercent };
}
```

## Testing Strategy
Vitest. `computeSectionTotals` ist eine reine Funktion, direkt unit-getestet (inkl. `budgetTotal = 0` → `usagePercent = 0`, keine Division durch 0). Anlegen/Bearbeiten von Budget/Sections inkl. Personen-Zuordnung wird als Integrationstest gegen eine per `provisionTenant()` erzeugte Tenant-DB getestet. Die Seiten werden zusätzlich manuell via Docker/curl verifiziert.

## Boundaries
- **Always:** `budgetUsed` ist in diesem Modul ein manuell editierbares Feld (Default `0`) — keine automatische Ableitung aus Zeiteinträgen. Das folgt in `time-tracking-v2`, sobald Zeiteinträge auf Sections verweisen können.
- **Ask first:** Löschen des alten `budgeting-basic`-Flat-Rate-Modells/-Seite (`/projects/[id]/budget`, `Project.budgetHours/budgetAmount/hourlyRate`) — bleibt für diesen Moment unangetastet, wird nicht aktiv verlinkt.
- **Never:** Eine Section kann nicht ohne zugehöriges Budget existieren; ein Budget nicht ohne zugehöriges Projekt.

## Success Criteria
- Financials-Bereich zeigt Projekt-Auswahl; pro Projekt beliebig viele Budgets möglich.
- Neues Budget benötigt Titel + Owner.
- Neue Section benötigt Name, mindestens keine Pflicht bei Personen (leer erlaubt), Budgeted Time, Quantity, Price.
- `budgetTotal = quantity * price`; `budgetRemaining = budgetTotal - budgetUsed`; `usagePercent` korrekt, `0` bei `budgetTotal = 0`.
- Jede Section ist nachträglich editierbar (alle Felder inkl. Personen-Zuordnung).

## Open Questions
Keine — Annahmen vom Menschen bestätigt.
