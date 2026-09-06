# Task List: budget-editor-parity

Ausgangslage: Productive.io-Artikel
https://help.productive.io/en/articles/6121123-setting-up-a-budget-budget-editor
(+ verlinkte Artikel zu Rate Cards, Service Types, Guaranteed Maximum Price,
Discounts/Markups, Budget Overrun Limitations, Recurring Budgets, Service
Custom Fields) wurde gescannt. Ergebnis: das Schema/Backend hatte bereits
`serviceType`, `billingType`, `trackingUnit`, `discountPercent`,
`markupPercent`, `guaranteedMaxPrice`, `blockOverrun` sowie Budget-Start-/
Enddatum/Farbe/Custom-Fields aus einer früheren Session — aber **nichts davon
war im UI (`BudgetDetailClient.tsx`) sichtbar**, und die angezeigte "Budget
Total"-Berechnung ignorierte Discount/Markup komplett (echter Rechenfehler).
Nutzer wählte Scope "Volle Productive.io-Parität".

## Bugfix: falsche Budget-Total-Berechnung
- [x] `computeSectionTotals()` nutzte `quantity * price` roh, ignorierte
  `discountPercent`/`markupPercent` — jetzt über `computeServiceTotal()` aus
  `servicePricing.ts` berechnet (gleiche Rabatt-zuerst-dann-Aufschlag-Logik
  wie beim Time-Entry-Booking)
- [x] Betroffen: Section-Tabelle in `BudgetDetailClient.tsx` UND die
  Budget-Summe in der Budget-Liste (`financials/[projectId]/page.tsx`)

## Bestehende Backend-Felder ins UI gebracht
- [x] Service Type, Billing Type, Tracking Unit, Discount/Markup %,
  Guaranteed Max Price + Block-Overrun-Checkbox — Anzeige- und
  Bearbeitungsformular in `SectionRow`/`ServicesTab`
- [x] Budget-Start-/Enddatum, Farbe (9er-Palette, wiederverwendet aus dem
  Projekt-Wizard) — editierbar über "Budget-Einstellungen"
- [x] Budget-Custom-Fields (`entityType: budget`, bereits vorhandenes Modell/
  Route) — `CustomFieldsPanel`, unterstützt text/number/date/select/person

## Neue Section-Felder
- [x] `description` (Freitext), `estimatedCost` (Float), `position` (Int,
  für Reihenfolge/Duplizieren)
- [x] `trackTime`/`trackExpenses`/`trackBooking` (Booleans, Tracking-Options-
  Icons wie im Artikel beschrieben). **Bewusste Grenze**: nur `trackTime`
  wird tatsächlich durchgesetzt (409 beim Zeitbuchen gegen eine Section mit
  `trackTime: false`, in `time-entries/route.ts`) — `trackExpenses`/
  `trackBooking` sind reine Konfigurations-Flags ohne echte Durchsetzung,
  weil Expense-Tracking und Resource-Booking als eigenständige Module in
  dieser Session weiterhin bewusst nicht gebaut werden (vorherige explizite
  Entscheidung: "Volle Erweiterung ohne Expense-Tracking").
- [x] Section duplizieren (`POST .../budget-sections/[id]/duplicate`, neue
  Position ans Ende) und Reihenfolge ändern (↑/↓-Buttons, tauschen die
  `position` zweier Nachbar-Sections)

## Rate Cards
- [x] Neues Modell `RateCardItem` (Name, Service Type, Billing Type,
  Tracking Unit, Preis) — wiederverwendbare Vorlage, unabhängig von
  einzelnen Budgets
- [x] Verwaltung unter `/settings/organization/rate-cards`
- [x] "Aus Rate Card übernehmen"-Auswahl im Service-Anlage-Formular füllt
  Name/Service Type/Billing Type/Tracking Unit/Preis vor

## Scenarios
- [x] `Budget.isScenario` + `Budget.scenarioOfId` (Self-Relation) — ein
  Szenario ist einfach ein weiteres `Budget` mit Flag, nutzt dieselbe
  Detail-Seite/Routen wie ein echtes Budget
- [x] `POST .../budgets/[id]/scenarios`: klont alle Sections 1:1 in ein neues
  Szenario-Budget
- [x] `POST .../budgets/[id]/promote` (id = Szenario-ID): ersetzt die
  Sections des Live-Budgets durch die des Szenarios, löscht danach das
  Szenario
- [x] Live-Budget-Liste (`financials/[projectId]/page.tsx`) filtert
  `isScenario: false`, damit Szenarien nicht als eigene Budgets auftauchen
- [x] Scenario-Banner auf der Detail-Seite mit Link zurück zum Live-Budget
  und "Als Live-Budget übernehmen"-Button

## Feed
- [x] `ActivityEvent.budgetId` (optional) ergänzt, `ActivityEventType` um
  `budget_created`/`budget_updated`/`budget_section_added`/
  `budget_section_updated`/`budget_section_removed`/`invoice_created`
  erweitert
- [x] `recordActivity()` erweitert um `budgetId`-Parameter, in allen
  Budget-/Section-/Invoice-Routen verdrahtet
- [x] `GET .../budgets/[id]/feed`, Feed-Tab zeigt chronologische Liste

## Time-Tab
- [x] Neuer Tab listet alle `TimeEntry`, die gegen Sections dieses Budgets
  gebucht wurden (Person, Service, Dauer, Betrag, Datum) — read-only,
  nutzt bereits vorhandene Daten, keine neue Schreib-Logik

## Bewusst NICHT gebaut (Scope-Grenzen)
- Kein echtes Expense-Tracking-Modul (Productive's "Expenses"-Tab) — konsistent
  mit der früheren expliziten Entscheidung in dieser Session
- Kein echtes Resource-Booking/Scheduling-Modul (Productive's Booking-Icon) —
  `resource-planning` ist weiterhin ein Platzhalter-Modul
- Kein Purchase-Orders-Tab — weiterhin Platzhalter-Modul
- Keine "Simple Editor"-Alternativ-UI — redundant zum einen bestehenden Editor
- Kein Field-Visibility-Menü (pro-Nutzer Feld-Sichtbarkeit) — alle Felder
  werden immer angezeigt, spart eine neue Pro-Nutzer-Einstellungs-Dimension
- Keine echten E-Mail-Benachrichtigungen ("quick notification settings") —
  es existiert keine E-Mail-Infrastruktur im Projekt; der Feed-Tab deckt die
  In-App-Sichtbarkeit ab

## Checkpoint: Abschluss
- [x] Migration `20260826201508_budget_editor_parity` angewendet
- [x] Tests: 478/478 grün (9 neue Tests: Discount/Markup-Rechenfehler-Fix,
  Rate-Card-Speicherung, Scenario-Klonen, Scenario-Promote, Section-
  Duplizieren, Section-Reorder, Track-Flags, Feed-Filterung nach Budget)
- [x] Build grün
- [x] Docker-E2E (2026-08-26): Budget mit Start-/Enddatum/Farbe angelegt;
  Section mit Service Type/Billing Type/Discount 10%/Markup 20%/Guaranteed
  Max Price/Block-Overrun angelegt; Rate-Card-Import getestet; Section
  dupliziert; Szenario erstellt, editiert (in den rohen Section-Daten
  sichtbar), promoted — Live-Budget-Sections korrekt ersetzt, Szenario
  danach gelöscht (404 bei erneutem Abruf); `trackTime: false` blockiert
  Zeitbuchung mit 409; Budget-Liste zeigt korrekte Summe (2660 = 1080 + 1080
  + 500, Discount/Markup korrekt eingerechnet) und **kein** Szenario in der
  Liste; Feed zeigt alle Events chronologisch; Rate-Cards-Settings-Seite
  rendert korrekt. 407 verwaiste Test-Datenbanken bereinigt.
