# Task List: invoicing-profitability

Siehe `tasks/plan-invoicing-profitability.md` und `SPEC-invoicing-profitability.md`.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: `Invoice`, `InvoiceLineItem`, `TimeEntry.invoiceId`, `User.internalCostRate`, Migration

## Phase 2: Reine Logik — ✅ erledigt
- [x] Task 2: `buildInvoiceLineItems()` + Tests (3 Tests grün)
- [x] Task 3: `computeProfitability()` + Tests (4 Tests grün)

## Phase 3: API — ✅ erledigt, via Docker verifiziert
- [x] Task 4: `POST`/`GET /api/tenant/budgets/[id]/invoices` + Integrationstest (`tests/invoicing.test.ts`, 1 Test grün)
- [x] Task 5: `PATCH /api/tenant/invoices/[id]`, `PATCH /api/tenant/users/[id]/cost-rate`

## Phase 4: UI — ✅ erledigt, via Docker verifiziert
- [x] Task 6: Rechnungen-Sektion in der Budget-Detail-Seite (Erstellen-Formular + Liste + Status-Toggle)
- [x] Task 7: Margen-Report auf `/financials/[projectId]`
- [x] Task 8: Interner-Stundensatz-Feld auf der Mitglieder-Seite

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (Rechnung mit korrektem Betrag/Line-Item erstellt, doppelte Abrechnung verhindert, Status-Wechsel, Margen-Report zeigt korrekte Umsatz/Kosten/Marge-Zahlen, 403 für member bei Rechnungs-Erstellung und Kostensatz-Änderung)
- [x] `npm test` (273 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
