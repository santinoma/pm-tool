# Implementation Plan: invoicing-profitability

## Overview
`Invoice` + `InvoiceLineItem` pro Budget, gespeist aus `TimeEntry`s, die
noch keiner Rechnung zugeordnet sind (`invoiceId IS NULL`). Erstellung
gruppiert nach `budgetSectionId`, summiert `durationMinutes` und `amount`,
markiert die Zeiteinträge atomar. Margen-Report ist eine reine Funktion
über bereits geladene Zeiteinträge + User-Kostensätze, kein neues
Aggregat-Modell.

## Architecture Decisions
- Nur Zeiteinträge mit `budgetSectionId` (aus time-tracking-v2) sind
  abrechenbar — reine Timer-Einträge ohne Section bleiben außen vor
  (kein Satz bekannt).
- `InvoiceLineItem.rate` wird beim Erstellen aus `BudgetSection.price`
  kopiert (nicht live verlinkt) — historische Korrektheit, falls sich der
  Satz später ändert (gleiches Muster wie `TimeEntry.amount`).
- `User.internalCostRate` ist optional; `null` zählt als 0 Kosten für diese
  Person — verhindert, dass das Feature blockiert, bis jeder Nutzer einen
  Satz hat.
- Margen-Report läuft über ALLE abrechenbaren Zeiteinträge eines Projekts
  (abgerechnet oder nicht) — zeigt "wenn wir alles Geloggte abrechnen,
  wie sieht die Marge aus", nicht nur bereits gestellte Rechnungen.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `Invoice`, `InvoiceLineItem`, `TimeEntry.invoiceId`, `User.internalCostRate`, Migration

### Checkpoint: Schema
- [ ] Migration, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `buildInvoiceLineItems()` (Zeiteinträge → Line Items je Section) + Tests
- [ ] Task 3: `computeProfitability()` (Umsatz/Kosten/Marge) + Tests

### Phase 3: API
- [ ] Task 4: `POST /api/tenant/budgets/[id]/invoices` (Rechnung erstellen, `$transaction`), `GET` (Liste) + Integrationstest
- [ ] Task 5: `PATCH /api/tenant/invoices/[id]` (Status), `PATCH /api/tenant/users/[id]/cost-rate` (nur owner/admin)

### Checkpoint: API
- [ ] Tests grün, Docker: keine doppelte Abrechnung, 403 für member

### Phase 4: UI
- [ ] Task 6: Rechnungen-Sektion in der Budget-Detail-Seite (Erstellen-Formular + Liste + Status-Toggle)
- [ ] Task 7: Margen-Report auf `/financials/[projectId]`
- [ ] Task 8: Interner-Stundensatz-Feld auf der Mitglieder-Seite

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Doppelte Abrechnung bei überlappenden Zeiträumen | Hoch | Filter `invoiceId IS NULL` schließt bereits abgerechnete Einträge zuverlässig aus, unabhängig vom gewählten Zeitraum |

## Open Questions
Keine.
