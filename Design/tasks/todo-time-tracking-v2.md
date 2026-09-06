# Task List: time-tracking-v2

Siehe `tasks/plan-time-tracking-v2.md` und `SPEC-time-tracking-v2.md`.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: Schema (`timeTrackingMode`, `TimeEntry.budgetSectionId`, `TimeEntry.amount`)

## Checkpoint: Schema — ✅ erreicht
- [x] Migration, Build grün

## Phase 2: Reine Logik — ✅ erledigt
- [x] Task 2: `computeEntryCost()` + Tests (3 Tests grün)

## Phase 3: API — ✅ erledigt, via Docker verifiziert
- [x] Task 3: Section-Pfad in `POST /api/tenant/time-entries` + Integrationstest (`tests/timeTrackingV2.test.ts`, 2 Tests grün)
- [x] Task 4: `timeTrackingMode` in tenant-settings PATCH

## Phase 4: UI — ✅ erledigt, via Docker verifiziert
- [x] Task 5: Tab-Shell `/time` (Meine Zeit / Book Absence-Platzhalter / Company Time-Platzhalter, Company Time nur für Admin/Owner sichtbar + serverseitig geschützt)
- [x] Task 6: Modus-Weiche in `/time/page.tsx` (rendert `TimeTrackingClient` bei `timer`, `EntriesCalendarClient` bei `entries`)
- [x] Task 7: Wochenkalender + "New time entry"-Modal (Datum editierbar vorbefüllt, Service-Dropdown aus zugewiesenen BudgetSections, Start/Ende in 15-Min-Schritten, Note, Save; Stundensatz wird nirgends im UI angezeigt)
- [x] Task 8: Modus-Auswahl in Settings → Zeiterfassung (`/settings/time-tracking`, statt Organisation — dort existierte bereits die passende Seite für `allowProjectLevelTimeEntries`)

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (Eintrag 08:15–08:30 → 15min, budgetUsed +30€ bei 120€/h; 403 für nicht zugeordnete User; Company-Time-Tab nur für Owner/Admin sichtbar, Redirect für Member; Settings-Toggle rendert & schreibt)
- [x] `npm test` (226 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
