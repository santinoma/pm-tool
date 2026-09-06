# Task List: productive-extensions (Budgets/Services, Custom Fields, Automations, Tasks)

Vier von Productive.io beschriebene Erweiterungen, umgesetzt gemäß bestätigter
Scope-Zuschnitte (jeweils "Empfohlen"-Option ohne Expense-Tracking/File-Typ/
Bulk-Selektion).

## Custom Fields
- [x] Neue Typen `multi_select` (JSON-Array im String-Feld) und `person`
- [x] `entityType` (task/budget) auf `CustomFieldDef`, neues
  `BudgetCustomFieldValue`-Modell parallel zu `CustomFieldValue`
- [x] `PUT /api/tenant/budgets/[id]/custom-fields/[fieldId]` (neu, analog zur
  Task-Variante), `person`-Typ prüft Nutzer-Existenz serverseitig
- [x] Tests: `customFieldValue.test.ts` (+4), `customFieldsExtension.test.ts` (4 neue)

## Budgets & Services
- [x] `Budget`: `startDate`/`endDate`/`color`
- [x] Echtes `ServiceType`-Modell ersetzt den Platzhalter unter
  `/settings/organization/service-types`
- [x] `BudgetSection`/Service: `serviceTypeId`, `billingType`
  (fixed/time_and_materials/non_billable/percentage), `trackingUnit`
  (hours/days/piece), `discountPercent`, `markupPercent`,
  `guaranteedMaxPrice`, `blockOverrun`
- [x] `computeEffectiveUnitPrice()`/`computeServiceTotal()`/`isOverrunBlocked()`
  (reine Logik, 9 Tests) — in `POST /api/tenant/time-entries` (Section-Pfad)
  verdrahtet: Rabatt/Aufschlag wirken auf den tatsächlich gebuchten Betrag,
  Guaranteed-Max-Price blockt Buchungen darüber hinaus (409)
- [x] Bewusst nicht gebaut: Estimated Cost/Expense-Tracking (eigene Domäne),
  Subsidiaries, Dokument-Vorlagen, separater Budget-Vorlagen-Mechanismus
  (redundant zu Projekt-Vorlagen)

## Automations
- [x] `AutomationRule.trigger` → `triggers[]` (Mehrfachauswahl)
- [x] Neue Trigger: `task_updated`, `task_commented`, `time_daily`, `time_weekly`
- [x] Neue Actions: `change_status`, `add_comment`
- [x] `isTimeAutomationDue()`/`computeAutomationPeriodKey()` — Pull-basiertes
  Muster analog zu den bestehenden automatischen Check-ins (7 Tests)
- [x] "Run Now"-Endpunkt (`POST /api/tenant/automation-rules/[id]/run-now`) für
  manuelles Testen — bewusste Scope-Grenze: führt eine Regel gezielt gegen
  EINEN gewählten Task aus, keine automatische Massenausführung über
  beliebige Tasks (bräuchte Productives "Check if"-Bulk-Selektionslogik,
  die explizit nicht Teil dieser Erweiterung ist)
- [x] Bugfix (im Zuge dieser Erweiterung gefunden): `tasks/[id]/comments`
  POST rief `recordActivity()` ohne `taskId` auf — Automations auf
  Kommentar-Basis konnten dadurch nie feuern, unabhängig vom neuen
  `task_commented`-Trigger. Behoben.
- [x] Tests: `selectMatchingRules.test.ts` (+2), `automationsExtension.test.ts` (3 neue)

## Tasks
- [x] Neues `NewTaskModal`-Component: Titel, Beschreibung, Status, Assignee,
  Start-/Fälligkeitsdatum, geschätzte Stunden, übergeordneter Task,
  Custom-Field-Werte (task-scoped)
- [x] Eingebunden in List- und Board-Ansicht (ersetzt das reine Titel-Feld)
- [x] Triage bewusst NICHT umgestellt — bleibt absichtlich minimales
  Quick-Capture-Inbox-Muster (Kernprinzip des Produkts laut
  CAPABILITY-MAP.md, nicht das reichhaltige Anlage-Formular)
- [x] `POST /api/tenant/tasks` erweitert um `statusId`/`startDate`/`dueDate`/
  `estimatedHours`/`parentTaskId`

## Checkpoint: Abschluss
- [x] Tests+Build grün (462/462), Docker-Verifikation, Review

### Docker-E2E-Verifikation (2026-08-26)
- Task-scoped `multi_select`-Feld + budget-scoped `person`-Feld angelegt,
  Entity-Type-Filterung über `?entityType=` korrekt getrennt.
- Task mit vollem Formular (Beschreibung/Assignee/Fälligkeit/Schätzung)
  angelegt, `multi_select`-Wert gesetzt und validiert (ungültige Option → 400).
- Service Type "Programming" angelegt, Budget mit Start-/Enddatum/Farbe,
  Service mit Billing-Type/Tracking-Unit/10% Rabatt/Guaranteed-Max 500€
  angelegt. 1h-Buchung → 90€ (Rabatt korrekt angewandt). Weitere 5h-Buchung
  → 409 (würde Guaranteed-Max überschreiten).
- Mehrfach-Trigger-Regel (`task_commented`+`task_updated`) mit
  `change_status`-Aktion: Kommentar auf Task → Status wechselt automatisch
  zu "Done" (nach dem oben genannten Bugfix bestätigt).
- Zeitbasierte Regel (`time_weekly`, Montag 09:00) mit `add_comment`-Aktion:
  "Run Now" gegen einen gewählten Task → Kommentar wird korrekt gepostet.
- Alle betroffenen Settings-Seiten (`service-types`, `automations`) und
  Projekt-Ansichten (`list`, `board`) rendern 200.
