# Spec: invoicing-profitability (v2 Modul 3)

## Objective
Aus gebuchten Zeiteinträgen (budgeting-v2) lassen sich Rechnungen pro Budget
erstellen (Zeitraum → eine Position je Budget-Section), und pro Projekt gibt
es einen Margen-Report (Umsatz aus abrechenbaren Stunden minus interne
Kosten je Person).

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
prisma/tenant/schema.prisma                      → Invoice, InvoiceLineItem, TimeEntry.invoiceId, User.internalCostRate
src/tenant/invoicing/generateInvoice.ts          → reine Aggregations-Logik (Zeiteinträge → Line Items)
src/tenant/invoicing/profitability.ts            → reine Margen-Berechnung
src/app/api/tenant/budgets/[id]/invoices/route.ts       → GET/POST (Rechnung erstellen)
src/app/api/tenant/invoices/[id]/route.ts               → PATCH (Status)
src/app/api/tenant/users/[id]/cost-rate/route.ts        → PATCH (interner Stundensatz)
src/app/(tenant)/financials/[projectId]/[budgetId]/     → UI-Erweiterung: Rechnungen-Liste + Erstellen
src/app/(tenant)/financials/[projectId]/page.tsx        → UI-Erweiterung: Margen-Report
tests/                                            → Unit + Integrationstest
```

## Code Style
Bestehende Muster: `canManageMembers`-Guard, `computeEntryCost()`
wiederverwendet, Field-Atlas-CSS, `$transaction` bei mehrschrittigen
Schreiboperationen (Rechnung + Zeiteinträge markieren).

## Testing Strategy
Vitest für die reinen Funktionen (Zeiteinträge → Line Items gruppiert nach
Section; Margen-Berechnung). Integrationstest: Rechnung erstellen markiert
Zeiteinträge, ein zweiter Erstellungsversuch im selben Zeitraum liefert
keine Duplikate mehr. Docker-E2E: Rechnung erstellen, Betrag prüfen, Status
ändern, Margen-Report-Zahlen prüfen, 403 für member.

## Boundaries
- Always: Bereits abgerechnete Zeiteinträge (`invoiceId` gesetzt) nie ein
  zweites Mal in eine neue Rechnung aufnehmen.
- Ask first: PDF-Export, E-Mail-Versand, Zahlungs-Integration — bewusst
  außerhalb des Scopes.
- Never: Eine Rechnung erstellen, ohne die zugehörigen Zeiteinträge
  atomar (`$transaction`) als abgerechnet zu markieren.

## Success Criteria
- Owner/Admin kann für ein Budget + Zeitraum eine Rechnung erstellen; sie
  enthält eine Position je Section mit Stunden, Satz und Betrag.
- Bereits abgerechnete Zeiteinträge tauchen in keiner weiteren Rechnung
  wieder auf.
- Rechnungsstatus ist manuell zwischen draft/sent/paid umschaltbar.
- `/financials/[projectId]` zeigt Umsatz, Kosten und Marge/Marge-% für das
  Projekt.
- 403 für `member` bei Rechnungs-Erstellung und beim Setzen des internen
  Stundensatzes.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt.
