# Task List: reporting-dashboards

Siehe `tasks/plan-reporting-dashboards.md` und `SPEC-reporting-dashboards.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `DashboardWidgetPreference` (userId, widgetType String, enabled Boolean default true, position Int, unique auf [userId, widgetType]).
**Acceptance:** Migration lässt sich anwenden.
**Verify:** `npm run db:tenant:migrate`
**Files:** `prisma/tenant/schema.prisma`
**Scope:** S

---

## Checkpoint: Schema — ✅ erreicht
- [x] Migration angewendet, `npm run build` grün

## Phase 2: Reine Logik

### Task 2: `computeOverdueTasks()` — ✅ erledigt
**Beschreibung:** Reine Funktion, filtert Tasks auf `dueDate < now` und Status-Kategorie ≠ `done`.
**Acceptance:** Task ohne `dueDate` wird nie als überfällig gezählt; Task mit zukünftigem `dueDate` nicht; Task mit `done`-Status nicht, selbst mit vergangenem `dueDate`.
**Verify:** `tests/reportingOverdue.test.ts`
**Files:** `src/tenant/reporting/overdue.ts`, `tests/reportingOverdue.test.ts`
**Scope:** S

### Task 3: `computeProgress()` — ✅ erledigt
**Beschreibung:** Reine Funktion, liefert `{ done, total, percent }` aus Tasks mit Status-Kategorie.
**Acceptance:** Leeres Array → `percent = 0` (keine Division durch 0); 2 done + 2 not_started → `percent = 50`.
**Verify:** `tests/reportingProgress.test.ts`
**Files:** `src/tenant/reporting/progress.ts`, `tests/reportingProgress.test.ts`
**Scope:** S

### Task 4: Widget-Katalog + Merge-Funktion — ✅ erledigt
**Beschreibung:** Feste Katalog-Konstante (Typ, Label, Default-Position, Default-`enabled=true`); reine Funktion `mergeWidgetPreferences(catalog, savedPreferences)` → sortierte, aufgelöste Liste.
**Acceptance:** Ohne gespeicherte Präferenzen entspricht das Ergebnis dem Katalog-Default; gespeicherte Präferenz überschreibt `enabled`/Position für genau diesen Typ.
**Verify:** `tests/reportingWidgets.test.ts`
**Files:** `src/tenant/reporting/widgets.ts`, `tests/reportingWidgets.test.ts`
**Scope:** S

---

## Phase 3: API + UI

### Task 5: Reports — ✅ erledigt, via Docker verifiziert (Triage korrekt ausgeschlossen)
**Beschreibung:** `GET /api/tenant/reports/overdue`, `GET /api/tenant/reports/progress`; `/reports/overdue/page.tsx`, `/reports/progress/page.tsx`.
**Acceptance:** Beide Seiten zeigen korrekte, Triage-ausschließende Daten.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/api/tenant/reports/overdue/route.ts`, `src/app/api/tenant/reports/progress/route.ts`, `src/app/(tenant)/reports/overdue/page.tsx`, `src/app/(tenant)/reports/progress/page.tsx`
**Scope:** M

### Task 6: Widget-Präferenz-Route — ✅ erledigt, via Docker verifiziert
**Beschreibung:** `GET/PATCH /api/tenant/dashboard/widgets` liest/schreibt eigene `DashboardWidgetPreference`-Zeilen.
**Acceptance:** GET ohne gespeicherte Präferenzen liefert Katalog-Default; PATCH persistiert Änderungen.
**Verify:** `tests/reportingDashboards.test.ts`
**Files:** `src/app/api/tenant/dashboard/widgets/route.ts`, `tests/reportingDashboards.test.ts`
**Scope:** S

### Task 7: Dashboard-Seite — ✅ erledigt, via Docker verifiziert
**Beschreibung:** `/dashboard/page.tsx` rendert aktivierte Widgets in gespeicherter Reihenfolge (Überfällige Tasks, Meine Tasks, Projekt-Fortschritt, Meine Auslastung diese Woche, Budget-Status); Steuerung für An/Aus + Reihenfolge (einfache Auf/Ab-Buttons).
**Acceptance:** Widget-Auswahl/-Reihenfolge bleibt nach Reload erhalten.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/(tenant)/dashboard/page.tsx`, `src/app/(tenant)/dashboard/DashboardClient.tsx`
**Scope:** M

---

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria aus SPEC-reporting-dashboards.md verifiziert
- [x] `npm test` (180 Tests) und `npm run build` grün
- [x] Review mit Mensch vor Abschluss des Moduls
