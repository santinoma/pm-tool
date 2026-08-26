# Spec: budgeting-basic

## Objective
Einfache Budget-Verfolgung pro Projekt: ein optionales Stunden-Budget und ein optionales Betrags-Budget, jeweils Soll vs. Ist. Kein Rechnungswesen, keine Rate Cards, keine mehrstufigen Sätze — das kommt erst in `invoicing-profitability` (v2), das explizit auf diesem Modul aufbaut.

**Nutzer:** Projekt-Owner/Admin, die grob überwachen wollen, ob ein Projekt im Rahmen bleibt.

**Erfolg:** Auf einer Projekt-Budget-Seite sind Soll-Stunden, Ist-Stunden (aus Zeiterfassung), Soll-Betrag und Ist-Betrag (Ist-Stunden × Stundensatz) sichtbar; Owner/Admin können die drei Budget-Felder bearbeiten.

## Tech Stack
Next.js (App Router) + TypeScript + PostgreSQL + Prisma — unverändert zum Rest des Projekts.

## Commands
Build: `npm run build`
Test: `npm test`
Migrate (Tenant-Schema): `npm run db:tenant:migrate`
Dev: `docker compose up -d`

## Project Structure
```
prisma/tenant/schema.prisma            → Project erhält budgetHours, budgetAmount, hourlyRate; TenantSettings erhält currency
src/tenant/budgeting/aggregate.ts      → reine Funktion: Ist-Stunden/Ist-Betrag aus TimeEntry[] berechnen
src/app/api/tenant/projects/[id]/budget/route.ts → GET (Soll/Ist-Zahlen), PATCH (Budget-Felder bearbeiten, owner/admin only)
src/app/(tenant)/projects/[id]/budget/page.tsx   → Anzeige + Bearbeitungsformular
tests/budgetAggregate.test.ts          → Unit-Tests für die reine Aggregationsfunktion
tests/budgeting.test.ts                → Integrationstest gegen echte Tenant-DB (Rollen-Schutz, Aggregation)
```

## Code Style
Reine Logik von DB/HTTP getrennt (bestehendes Muster, siehe `src/tenant/time-tracking/aggregate.ts` als Vorbild):
```ts
export function computeBudgetStatus(entries: { durationMinutes: number | null }[], hourlyRate: number | null) {
  const actualMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
  const actualHours = actualMinutes / 60;
  const actualAmount = hourlyRate != null ? actualHours * hourlyRate : null;
  return { actualHours, actualAmount };
}
```

## Testing Strategy
Vitest. `computeBudgetStatus` (reine Funktion) wird direkt unit-getestet (kein Zeitaufwand → 0; Betrag nur wenn hourlyRate gesetzt → null sonst). DB-Zugriff (Aggregation über echte TimeEntry-Zeilen inkl. task-gebundener Einträge am primären Projekt, Rollen-Schutz beim PATCH) wird als Integrationstest gegen eine per `provisionTenant()` erzeugte Tenant-DB getestet. Die Route selbst wird zusätzlich manuell via Docker/curl verifiziert.

## Boundaries
- **Always:** Budget-Felder sind optional (nullable) — ein Projekt ohne Budget zeigt einfach keine Soll-Werte, keine Fehlermeldung.
- **Ask first:** Änderungen am `TenantSettings`-Schema (hier: `currency`-Feld) — bereits abgestimmt, siehe unten.
- **Never:** Keine automatische Rechnungsstellung, keine Benachrichtigungen bei Budgetüberschreitung (das ist `notifications`/`reporting-dashboards`), keine Multi-Rate/Rate-Cards.

## Success Criteria
- Projekt mit gesetztem `budgetHours` zeigt Soll- und Ist-Stunden korrekt an (Ist = Summe aller `TimeEntry.durationMinutes`, direkt am Projekt ODER über einen Task, der primär diesem Projekt zugeordnet ist).
- Projekt mit gesetztem `hourlyRate` zeigt zusätzlich einen berechneten Ist-Betrag; ohne `hourlyRate` wird kein Ist-Betrag angezeigt (kein Fehler).
- PATCH auf die Budget-Route durch ein `member` (nicht owner/admin) wird abgelehnt (403).
- `TenantSettings.currency` (Default `"EUR"`) wird als Formatierungs-Suffix/Symbol bei Beträgen verwendet.

## Open Questions
Keine offenen Fragen — Annahmen wurden vom Menschen bestätigt ("Passt so").
