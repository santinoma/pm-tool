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
- [x] T201 Generischer Filter-Builder (AND/OR-Gruppen, Operatoren) — Datenmodell
      (`src/tenant/views/filterEngine.ts`: entitätsagnostischer Evaluator +
      `__ME__`-Auflösung über verschachtelte Gruppen hinweg). UI-Anbindung an
      ListClient.tsx/MyTasksClient.tsx folgt in T202 — der Evaluator ersetzt
      noch nichts Bestehendes, `resolveViewFilters.ts` bleibt vorerst aktiv.
- [x] T202 Filter-Builder — UI-Komponente, ersetzt Einzel-Dropdown-Filter in
      ListClient.tsx / MyTasksClient.tsx (`FilterBuilderPopover`, V1 als eine
      flache AND/OR-Gruppe — Nesting ist im Evaluator (T201) bereits möglich,
      UI dafür bewusst zurückgestellt, bis mehr Felder das rechtfertigen).
      Alte `{statusFilter}`-SavedViews werden über `parseFilterConfig`
      rückwärtskompatibel gelesen.
- [x] T203 Spaltenkonfiguration (hinzufügen/entfernen/umsortieren) — Fields-
      Popover in ListClient.tsx um Auf/Ab-Reorder-Buttons erweitert, zwei
      neue Spalten (Start, Priorität) ergänzt, Spaltenreihenfolge +
      Sichtbarkeit in SavedView.sortConfig persistiert (rückwärtskompatibel:
      fehlt eine neu hinzugekommene Spalte in einer alten SavedView, wird sie
      angehängt statt zu verschwinden)
- [x] T204 `SavedView` auf Budgets ausweiten — neuer Scope "budgets"
      (`saved-views/route.ts`, `SavedViewsBar` verallgemeinert von
      scope-Literal-Vergleich auf `projectId`-Anwesenheit), Filter/Sort in
      `ProjectBudgetsClient.tsx` (Owner/Titel-Filter, Sort: Titel/Owner/
      Budget Total)
- [x] T205 `SavedView` auf Zeit-Ansichten ausweiten — neuer privater Scope
      "time_entries" (wie "my_tasks", kein Sharing) für "Meine letzten
      Einträge" auf der /time-Seite; Filter (Projekt/Status/Eingereicht)
      + Sort (Datum/Dauer/Task); `saved-views/route.ts` und
      `SavedViewsBar.tsx` von den hartkodierten scope-Strings "project"/
      "my_tasks" auf generische PROJECT_SCOPES/PRIVATE_SCOPES-Listen
      umgestellt (Company Time/Absence/Timesheet-Matrix haben keine
      filterbare Zeilenliste — dort bleibt nichts zu erweitern)
- [x] T206 Table-Layout als neuer Ansichtstyp — bereits vorhanden
      (`projects/[id]/table/TableViewClient.tsx`, vollständig funktional inkl.
      eigenem Sort mit Richtung), im Audit übersehen/vor dieser Session
      entstanden. Kein neuer Code nötig.
- [x] T207 Workload-Layout als neuer Ansichtstyp — bereits vorhanden
      (`projects/[id]/workload/WorkloadClient.tsx`, echte Kapazitäts-/
      Auslastungs-Berechnung, teilt sich die Utilization-Logik mit dem
      Resource Planner). Kein neuer Code nötig.
- [x] T208 Sortierrichtung (auf/absteigend) ergänzen — TableViewClient.tsx
      hatte das bereits; neuer gemeinsamer `SortDirectionButton` in
      ListClient.tsx, MyTasksClient.tsx, ProjectBudgetsClient.tsx und
      TimeTrackingClient.tsx ergänzt, jeweils in SavedView.sortConfig
      persistiert

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
- [x] T220 `CustomFieldDef.required` + serverseitige Erzwingung
- [x] T221 `CustomFieldDef.sensitive` + sichtbarkeitsbeschränkte Auslieferung
- [x] T222 Auto-Attach-Mechanismus für Library-Felder an neue Projekte
- [ ] T223 `TaskPriority` → echtes `select`-Custom-Field migrieren (ersetzt
      Eigenentwicklung, alle 8 Lese-/Schreibstellen umstellen, siehe plan.md).
      **Zurückgestellt bis T201-T208 (Filter/Sort-Builder) stehen** — plan.md
      verlangt ausdrücklich Einbindung ins neue Sortier-/Filtersystem, das ohne
      Custom-Field-Sort/Filter-Unterstützung sonst ersatzlos verloren ginge
      (siehe TableViewClient.tsx-Sortierung im Audit).
- [ ] T224 `TaskTShirtSize` → echtes `select`-Custom-Field migrieren (selbe
      Zurückstellung wie T223)

### Billing & Account Management (Grundstufe)
- [x] T230 Sitzplatz-Feld auf Tenant/TenantSettings, bezahlt vs. kostenlos
- [x] T231 Sitzplatz-Limit-Prüfung in `invites/route.ts`

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
