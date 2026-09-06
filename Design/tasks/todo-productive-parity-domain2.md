# Task List: Produktiv-Parität Domäne 2 (Budgets/Invoicing/Reports)

Quelle: `tasks/plan-productive-parity-roadmap.md`, Domäne 2.

## Invoice-Lifecycle + Zahlungsverfolgung + Credit Notes — ✅ erledigt
- [x] `InvoiceStatus` erweitert: draft/finalized/sent/partially_paid/paid
- [x] `InvoicingMethod`-Enum: uninvoiced_time_expenses/remaining_amount/percentage,
  alle drei Berechnungsarten implementiert (siehe `generateInvoice.ts`)
- [x] Finalisieren sperrt weitere Line-Item-Bearbeitung (409)
- [x] `InvoicePayment`-Modell + API, Auto-Status-Übergang sent→partially_paid→paid
- [x] `CreditNote`-Modell + API, mindert nur den berechneten offenen Betrag,
  `totalAmount` bleibt unangetastet
- [x] Einfacher `taxRatePercent` pro Line-Item (Anzeige-only, keine Jurisdiktionen)
- [x] UI in `InvoicesClient.tsx`: Methoden-Auswahl, Finalisieren/Versenden,
  Zahlungs-/Gutschrift-Mini-Formulare, Offener-Betrag-Anzeige
- [x] Test: `invoiceLifecycle.test.ts` (6 Tests)

## Budget-"Deliver"-Lifecycle + automatisierte Warnschwellen — ✅ erledigt
- [x] `Budget.deliveredAt`, `POST /deliver`/`/undeliver` (owner/admin, 409 bei
  Doppel-Lieferung)
- [x] Gelieferte Budgets blockieren weitere Zeitbuchungen auf allen Sektionen
  (zusätzlich zum bestehenden `trackTime`/Overrun-Block)
- [x] `BudgetSection.warningThresholdPercent`/`warningNotifiedAt`: Schwellenwert-
  Überschreitung löst genau einmal eine In-App-Benachrichtigung an den
  Budget-Owner aus (kein echter E-Mail-Versand — keine solche Infrastruktur
  vorhanden, bewusst nicht neu gebaut)
- [x] Test: `budgetDeliverAndWarnings.test.ts` (3 Tests)

## Report-Builder — ✅ erledigt
- [x] `SavedReport`-Modell, 3 Datenquellen (tasks/time_entries/budgets)
- [x] Reine Query-Engine `reportQuery.ts` (Filter: eq/neq/contains/gt/lt, Gruppierung)
- [x] `/reports/builder` — Datenquelle/Filter/Gruppierung wählen, ausführen,
  speichern, laden. Bewusst kein Chart-Rendering (nur gruppierte Tabelle) —
  proportionaler Scope für v1
- [x] Bestehende `/reports/overdue`/`/reports/progress` unangetastet gelassen
- [x] Test: `reportQuery.test.ts` (16 Tests)

## Wiederkehrende Budgets (echte Engine) + Budget-Templates — ✅ erledigt
- [x] `isRetainer`/`recurrenceInterval` existierten bereits als reine Metadaten
  ohne Wirkung — jetzt echt: Pull-based Periodenschlüssel-Muster (analog
  Check-ins/Automations), Prüfung beim Laden der Budget-Liste eines Projekts
- [x] Generierte Instanzen sind eigenständige (nicht-retainer) Budgets, nur das
  ursprüngliche Retainer-Budget bleibt die wiederkehrende Quelle
- [x] `Budget.isTemplate`, `POST /api/tenant/budgets` mit `templateBudgetId`
  kopiert alle Sektionen (geteilte `cloneBudgetSections()`-Hilfsfunktion,
  auch von der Recurrence-Engine genutzt)
- [x] Tests: `computeBudgetPeriodKey.test.ts`, `cloneRecurringBudget.test.ts` (10)

## Umsetzung: 4 parallele Agenten, 1 Fehlversuch (2026-08-26/27)
Nutzer bat um autonome Nachtarbeit über mehrere Domänen. Erster Durchlauf
aller 4 Domäne-2-Agenten scheiterte, weil der Rechner in den Schlaf ging
(API-Stream-Abbrüche/Watchdog-Timeouts) — alle 4 wurden mit identischen
Prompts neu gestartet, teils auf bereits vorhandenen Teilarbeiten aus dem
ersten Versuch aufbauend (verifiziert statt blind übernommen). Zentral
verifiziert: Build + volle Testsuite grün (562/562, davon 35 neue Tests),
Docker-E2E (Budget liefern→409 bei Doppel-Lieferung→zurücknehmen,
Report-Builder-Query liefert korrekte Gruppierung, Report-Builder-Seite
rendert). Tenant-Plan musste für den E2E-Test manuell auf "enterprise"
gesetzt werden (Budgets-Feature ist plangated, Standard-Tenant hat "small").
186 verwaiste Test-DBs bereinigt.

## Checkpoint: Abschluss
- [x] Tests+Build grün (562/562), Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
