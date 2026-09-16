# Plan: Productive.io-Parität — technische Roadmap

Reihenfolge nach Risiko/Nutzen, nicht nach Modul. Phase 0 ist abgeschlossen (siehe unten).
Details und Fundstellen je Domäne: veröffentlichtes Artefakt "Redline-Audit" sowie die
Original-Audit-Reports im Chat-Verlauf vom 16.09.2026.

## Phase 0 — Richtigstellen (abgeschlossen 16.09.2026)

- Hill Chart & Triage als abwählbare Module im Projekterstellungs-Wizard ergänzt
  (`moduleCatalog.ts`, `ProjectSubnav.tsx`, `layout.tsx`). Cycles/Baselines/Check-ins
  waren bereits abwählbar.
- Bug behoben: `priority`/`tShirtSize` wurden von der Task-PATCH-Route verworfen.
- `EIGENENTWICKLUNGEN.md` angelegt (TransitionRule offen, TaskPriority/TShirtSize hat
  Zielphase in Phase 2).

## Phase 1 — Bugs fixen (falsche Berechnungen mit Report-Auswirkung)

Reihenfolge innerhalb der Phase: erst Revenue Recognition (finanziell am kritischsten),
dann die übrigen.

1. **Revenue Recognition entkoppeln von Rechnungsstellung**
   (`src/tenant/financials/revenueRecognition.ts`): `immediate`-Modus muss auf
   genehmigte Zeit/Spesen/Bookings basieren (T&M), nicht auf `invoicedAmount`.
   `straight_line` nur noch auf Fixed/Percentage anwenden, nicht auf T&M-Sections;
   `Budget.deliveredAt`-Fallback-Kette einbauen (delivery date → budget end → budget
   start), siehe Productive-Artikel "Fixed Price Revenue Recognition Models".
2. **Rate-Card-Auflösung**: Standard- und kundenspezifische Rate Card gemeinsam
   anbieten statt zu ersetzen (`src/tenant/financials/rateCards.ts →
   getEffectiveRateCardItems`).
3. **Offboarding**: `Deal.ownerId`-Reassignment ergänzen (Pflichtfeld, aktuell nie
   angefasst) sowie `AbsenceRequest.reviewedById`, in
   `src/app/api/tenant/users/[id]/offboard/route.ts`.
4. **Invoicing "uninvoiced_time_expenses"** soll tatsächlich `Expense`-Zeilen
   einbeziehen, nicht nur `TimeEntry` (`generateInvoice.ts` / Budget-Invoice-Route).
5. **`multi_select` Custom Fields**: `CustomFieldInput.tsx` braucht einen Render-Zweig
   dafür (Checkbox-Liste analog zu `select`, aber Mehrfachauswahl, Speicherung als
   JSON-Array-String ist bereits korrekt in `customFieldValue.ts`).
6. **Automations — Fehlerhandling**: `executeRuleActions` soll einen Fehler in einer
   Aktion nicht die ganze Regel abbrechen lassen, sondern nur die betroffene
   Aktion/das betroffene Objekt überspringen (Productive-Modell).

## Phase 2 — Große Lücken

1. **Views, Layouts & Filters (Neubau)**:
   - Generischer Filter-Builder mit AND/OR-Gruppen und Operatoren (=, ≠, >, <, enthält,
     ist leer …), ersetzt die bisherigen Einzel-Dropdown-Filter.
   - Spaltenkonfiguration (hinzufügen/entfernen/umsortieren) statt fester 2-Spalten-Liste.
   - `SavedView` auf weitere Module ausweiten (aktuell nur Projekt-Task-Liste + Meine
     Aufgaben) — Budgets, Deals, Zeit, Company Time, Docs mindestens.
   - Table- und Workload-Layout als neue Ansichtstypen.
   - Sortierrichtung (auf/absteigend) ergänzen.
2. **Settings**:
   - `TenantSettings` um Location & Format (Zeitzone, Datums-/Zahlenformat), Work Time
     (Wochenstart, Arbeitstage, Person-Day-Stunden), Fiscal Year erweitern.
   - Notifications-, Appearance-, Recycle-Bin-, Employee-Fields-Seiten mit echter
     Funktion statt Platzhalter füllen.
3. **Custom Fields — Required/Sensitive + Auto-Attach**:
   - `CustomFieldDef` um `required`/`sensitive` erweitern, serverseitige Erzwingung.
   - Auto-Attach-Mechanismus für Library-Felder an neue Projekte (Voraussetzung für
     die TaskPriority-Migration unten).
   - Danach: **`TaskPriority`/`TaskTShirtSize` auf echte `select`-Custom-Fields
     migrieren** (ersetzt die Eigenentwicklung, siehe `EIGENENTWICKLUNGEN.md`),
     inkl. Umstellung der 8 bekannten Lese-/Schreibstellen und Einbindung ins neue
     Sortier-/Filtersystem aus Punkt 1.
   - Custom Fields auf weitere Entitäten ausweiten (Deals/Companies/Contacts), sofern
     diese Objekte im Tool existieren.
4. **Billing & Account Management (Neubau, Grundstufe)**:
   - Sitzplatz-Feld auf `Tenant`/`TenantSettings`, Unterscheidung bezahlt (Employee/
     Contractor) vs. kostenlos (Client).
   - Sitzplatz-Limit-Prüfung in `src/app/api/tenant/invites/route.ts`.
   - (Zahlungsanbieter-Integration bewusst nicht Teil dieser Phase — eigenständiges,
     größeres Vorhaben, erst wenn Sitzplatz-Modell steht.)

## Phase 3 — Bestehendes verbreitern

1. **Permission-Katalog** von 10 auf domänenspezifische Rechte ausbauen (Invoicing,
   Kostensätze, Employee-Field-Sensitivität), Manager-/Profitability-Manager-Trennung.
2. **Automations**: weitere Objekttypen (Budget, Deal, Invoice), echtes
   Attribut/Vergleichsoperator-Bedingungssystem statt der einen Status-Kategorie-
   Bedingung, echter Scheduler statt Pull-on-Page-Load.
3. **Übergangsregeln (`TransitionRule`)**: erneut bewerten, sobald Required Custom
   Fields (Phase 2) stehen — ersetzen falls das Required-Fields-Modell den Bedarf
   deckt, sonst als Eigenentwicklung final kennzeichnen (`EIGENENTWICKLUNGEN.md`).
4. **Budgets**: Deliverables, Percentage-Billing-Berechnung, Budget-Template-Center,
   Financial Month Closing, Billable-Rate-Strategie (Person/Service/Single/No Rate).
5. **User Management**: Teams/Departments-Modell, Employee-vs-Contractor-Unterscheidung,
   Kostensatz-Historie.

## Nicht in dieser Roadmap

Zahlungsanbieter-Integration (Stripe o. ä.), volles Self-Service-Abo-Management,
KI-gestützte Automations/Filter — bewusst außen vor, da eigene, größere
Produktentscheidungen jenseits eines reinen Doku-Abgleichs.
