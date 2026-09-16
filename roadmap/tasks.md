# Tasks

Abhaken nach Abschluss (inkl. tsc/eslint/Tests grün + committed). Reihenfolge = Priorität
innerhalb der Phase. Bei Blockade: Task offen lassen, kurze Notiz darunter, mit nächstem
Task weitermachen — nicht die ganze Phase anhalten.

## Phase 0 — Richtigstellen

- [x] T001 Hill Chart & Triage als Wahl-Module im Projekterstellungs-Wizard
- [x] T002 Bugfix: `priority`/`tShirtSize` in Task-PATCH-Route ergänzt
- [x] T003 `EIGENENTWICKLUNGEN.md` angelegt

## Phase 1 — Bugs fixen

- [x] T101 Revenue Recognition: `immediate`-Modus an genehmigte Zeit/Spesen/Bookings
      koppeln statt an `invoicedAmount`
- [x] T102 Revenue Recognition: `straight_line` nur auf Fixed/Percentage, nicht T&M;
      `deliveredAt`-Fallback-Kette einbauen
- [x] T103 Rate-Card-Auflösung: Standard- und Kunden-Rate-Card gemeinsam anbieten
- [x] T104 Offboarding: `Deal.ownerId` reassignen
- [x] T105 Offboarding: `AbsenceRequest.reviewedById` reassignen
- [x] T106 Invoicing "uninvoiced_time_expenses": Expenses tatsächlich einbeziehen
- [x] T107 `multi_select` Custom Fields in `CustomFieldInput.tsx` render-/auswählbar
      machen
- [x] T108 Automations: Fehler in einer Aktion bricht nicht die ganze Regel ab

## Phase 2 — Große Lücken

### Views, Layouts & Filters
- [ ] T201 Generischer Filter-Builder (AND/OR-Gruppen, Operatoren) — Datenmodell
- [ ] T202 Filter-Builder — UI-Komponente, ersetzt Einzel-Dropdown-Filter in
      ListClient.tsx / MyTasksClient.tsx
- [ ] T203 Spaltenkonfiguration (hinzufügen/entfernen/umsortieren)
- [ ] T204 `SavedView` auf Budgets ausweiten
- [ ] T205 `SavedView` auf Zeit-Ansichten ausweiten
- [ ] T206 Table-Layout als neuer Ansichtstyp
- [ ] T207 Workload-Layout als neuer Ansichtstyp
- [ ] T208 Sortierrichtung (auf/absteigend) ergänzen

### Settings
- [x] T210 `TenantSettings`: Location & Format (Zeitzone, Datums-/Zahlenformat)
- [x] T211 `TenantSettings`: Work Time (Wochenstart, Arbeitstage, Person-Day-Stunden)
- [x] T212 `TenantSettings`: Fiscal Year
- [x] T213 Notifications-Settings-Seite mit echter Funktion
- [x] T214 Appearance-Settings-Seite mit echter Funktion
- [ ] T215 Recycle-Bin-Seite mit echter Funktion — ZURÜCKGESTELLT: erfordert
      Soft-Delete (`deletedAt`) auf Task (und ggf. weiteren Entitäten) plus
      Anpassung an **38 Query-Stellen** quer durchs Produkt (Liste/Board/
      Tabelle/Gantt/Timeline/My Tasks/Triage/Cycles/Suche/Reports …), die alle
      `deletedAt: null` respektieren müssten. Zu große, nicht in einem
      Durchgang sicher verifizierbare Änderung für autonome Umsetzung ohne
      Review-Checkpoint — braucht eigenen, kleinteiligen Anlauf (z. B. erst
      Task-Löschung auf Soft-Delete umstellen und alle 38 Stellen einzeln
      nachziehen, bevor die Recycle-Bin-UI selbst kommt).
- [x] T216 Employee-Fields-Seite mit echter Funktion

### Custom Fields — Required/Sensitive + Auto-Attach
- [ ] T220 `CustomFieldDef.required` + serverseitige Erzwingung
- [ ] T221 `CustomFieldDef.sensitive` + sichtbarkeitsbeschränkte Auslieferung
- [ ] T222 Auto-Attach-Mechanismus für Library-Felder an neue Projekte
- [ ] T223 `TaskPriority` → echtes `select`-Custom-Field migrieren (ersetzt
      Eigenentwicklung, alle 8 Lese-/Schreibstellen umstellen, siehe plan.md)
- [ ] T224 `TaskTShirtSize` → echtes `select`-Custom-Field migrieren

### Billing & Account Management (Grundstufe)
- [ ] T230 Sitzplatz-Feld auf Tenant/TenantSettings, bezahlt vs. kostenlos
- [ ] T231 Sitzplatz-Limit-Prüfung in `invites/route.ts`

## Phase 3 — Bestehendes verbreitern

- [ ] T301 Permission-Katalog: Invoicing-Rechte ergänzen
- [ ] T302 Permission-Katalog: Kostensatz-Rechte ergänzen
- [ ] T303 Permission-Katalog: Employee-Field-Sensitivität ergänzen
- [ ] T304 Permission-Katalog: Manager- vs. Profitability-Manager-Trennung
- [ ] T305 Automations: weitere Objekttypen (Budget, Deal, Invoice)
- [ ] T306 Automations: echtes Attribut/Vergleichsoperator-Bedingungssystem
- [ ] T307 Automations: echter Scheduler statt Pull-on-Page-Load
- [ ] T308 TransitionRule erneut bewerten (nach T220-T222)
- [ ] T309 Budgets: Deliverables
- [ ] T310 Budgets: Percentage-Billing-Berechnung
- [ ] T311 Budgets: Budget-Template-Center
- [ ] T312 Budgets: Financial Month Closing
- [ ] T313 Budgets: Billable-Rate-Strategie (Person/Service/Single/No Rate)
- [ ] T314 User Management: Teams/Departments-Modell
- [ ] T315 User Management: Employee-vs-Contractor-Unterscheidung
- [ ] T316 User Management: Kostensatz-Historie

## Log (kurz, nur bemerkenswerte Entscheidungen während der Umsetzung)

- 16.09.2026: Phase 0 abgeschlossen, gepusht.
