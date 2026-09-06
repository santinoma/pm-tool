# Task List: Produktiv-Parität Domäne 3 (Resourcing/Time)

Quelle: `tasks/plan-productive-parity-roadmap.md`, Domäne 3.

## Time-Approval-Workflow + Timesheet-Locking — ✅ erledigt
- [x] `TimeEntry.approvalStatus`/`approvedById`/`approvedAt`, `PATCH .../approve`/`.../reject`
- [x] `TimesheetLock`-Modell: sperrt die GESAMTE Periode für einen User (nicht
  nur bereits freigegebene Einträge) — bewusste Design-Entscheidung für ein
  einfacheres mentales Modell, dokumentiert im Code
- [x] `GET .../pending-approval` für Freigabe-Warteschlange
- [x] UI in `time/page.tsx`: Freigabe-Tabelle + Sperr-Formular (owner/admin),
  Status-/Sperr-Badges für alle
- [x] Test: `timeEntryApproval.test.ts` (4 Tests)

## Time-Tracking-Policies + Zeit für andere buchen — ✅ erledigt
- [x] `TimeTrackingPolicy` (Singleton-Zeile): `maxDailyHours`, `blockWeekends`,
  `blockOverlaps`, reine Validierungsfunktion `validateAgainstPolicy()`
- [x] In `POST /api/tenant/time-entries` verdrahtet (beide Buchungspfade)
- [x] `onBehalfOfUserId` (owner/admin) → `userId` = Zielperson,
  `loggedForUserId` = tatsächlich Buchender (Audit-Trail)
- [x] UI: Policy-Sektion in `settings/time-tracking`, "Für:"-Dropdown im
  Zeiterfassungs-Formular
- [x] Test: `policyValidation.test.ts` (21 Tests)
- **Behoben (2026-08-27)**: der manuelle Dauer-Buchungspfad ignorierte
  `startedAt`/`endedAt` aus dem Request-Body vollständig und nutzte für
  die Policy-Prüfung immer `new Date()` (heute) statt eines vom Aufrufer
  gemeinten Datums. Neues optionales `date`-Feld ergänzt (`POST
  /api/tenant/time-entries`), das sowohl für die Policy-Prüfung als auch
  zur Persistierung als `startedAt` verwendet wird — ermöglicht jetzt
  echtes Nacherfassen für zurückliegende Tage. UI: Datums-Feld im
  manuellen Erfassungs-Formular (`time/TimeTrackingClient.tsx`). Test:
  `manualTimeEntryDate.test.ts` (5 Tests), Docker-E2E bestätigt
  (`blockWeekends` blockiert jetzt korrekt einen explizit übergebenen
  Samstag).

## Resource-Planner-MVP (echtes Buchungs-Grid) — ✅ erledigt
- [x] `ResourceBooking`-Modell (Person ODER Platzhalter, Zeitraum, Std/Tag,
  `isTentative`), additiv zur bestehenden Task-basierten Ansicht
- [x] Reine `computeDailyCapacity()`: konfirmierte vs. tentative Stunden
  getrennt, Über-Kapazität-Flag nur aus konfirmierten Buchungen
  (Tages-Baseline: `weeklyCapacityHours / 5`, dokumentiert da
  `computeUtilization` keine Tages-Granularität kennt)
- [x] UI: Buchungs-Grid (Personen/Platzhalter × Wochentage) mit Rot/Grün,
  gestrichelte Darstellung für tentative Buchungen
- [x] Test: `resourceBookingCapacity.test.ts` (16 Tests)

## Feiertagskalender — ✅ erledigt
- [x] `HolidayCalendar`/`Holiday`-Modelle, `User.holidayCalendarId`
- [x] `computeEffectiveWeeklyCapacity()` — reduziert Kapazität proportional
  zu Feiertagen in der Woche, als NEUE Funktion (bestehende
  `computeUtilization`-Signatur unverändert, keine Breaking Changes)
- [x] UI: Kalender-Verwaltung in Settings, Zuweisung auf der Mitglieder-Seite
- [x] Test: `holidayCapacity.test.ts` (12 Tests)

## Umsetzung: 4 parallele Agenten (2026-08-27)
Alle vier Gruppen bearbeiteten teils dieselben Dateien (`time-entries/route.ts`,
`resource-planning/page.tsx`) gleichzeitig — jeder Agent hat vor jedem
Schreibvorgang neu gelesen, wodurch alle vier sich ohne Konflikte
integrierten. Ein temporärer Signatur-Mismatch in einem bereits committeten
Test (`budgetDeliverAndWarnings.test.ts`, aus Domäne 2) durch eine geänderte
Funktionssignatur wurde vom letzten fertigstellenden Agenten selbst behoben.
Zentral verifiziert: Build + volle Testsuite grün (630/630, davon 68 neue
Tests seit Domäne-2-Commit), Docker-E2E (Platzhalter-Buchung, Feiertag
angelegt, Tages-Limit-Policy korrekt durchgesetzt). 212 verwaiste Test-DBs
bereinigt.

## Checkpoint: Abschluss
- [x] Tests+Build grün (630/630), Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
