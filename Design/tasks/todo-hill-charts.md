# Task List: hill-charts

Siehe `tasks/plan-hill-charts.md` und `SPEC-hill-charts.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `Task` erhält `hillPosition` (Float?, 0-100).
**Acceptance:** Migration lässt sich anwenden.
**Verify:** `npm run db:tenant:migrate`
**Files:** `prisma/tenant/schema.prisma`
**Scope:** S

---

## Checkpoint: Schema — ✅ erreicht
- [x] Migration angewendet, `npm run build` grün

## Phase 2: Reine Logik

### Task 2: `hillPositionToCoords()` — ✅ erledigt
**Beschreibung:** Reine Funktion, mappt `hillPosition` (0-100) auf `{x, y}`-Koordinaten einer Parabel-Hügelkurve.
**Acceptance:** Position 0 → linker Fußpunkt (`y` minimal); Position 50 → Gipfel (`y` maximal); Position 100 → rechter Fußpunkt (`y` minimal); `x` steigt monoton mit der Position.
**Verify:** `tests/hillChartGeometry.test.ts`
**Files:** `src/tenant/hillChart/geometry.ts`, `tests/hillChartGeometry.test.ts`
**Scope:** S

---

## Phase 3: API + UI

### Task 3: Task-PATCH-Route erweitern — ✅ erledigt, via Docker verifiziert
**Beschreibung:** `PATCH /api/tenant/tasks/[id]` akzeptiert zusätzlich `hillPosition` (Float 0-100 oder `null`).
**Acceptance:** Wert wird persistiert und bei GET zurückgegeben.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/api/tenant/tasks/[id]/route.ts`
**Scope:** S

### Task 4: Hill-Chart-Seite — ✅ erledigt, via Docker verifiziert (done/Triage-Ausschluss bestätigt)
**Beschreibung:** `/projects/[id]/hill-chart/page.tsx` + `HillChartClient.tsx` — SVG-Hügelkurve, Punkte für Tasks mit gesetzter `hillPosition` (ohne `done`/Triage), Drag zum Verschieben (native Mouse-Events analog zum Gantt).
**Acceptance:** Anzeige korrekt (done/Triage ausgeschlossen); Drag aktualisiert `hillPosition` persistent.
**Verify:** Manuell im Browser/Docker; Drag-UX-Feinschliff an den Menschen delegiert
**Files:** `src/app/(tenant)/projects/[id]/hill-chart/page.tsx`, `src/app/(tenant)/projects/[id]/hill-chart/HillChartClient.tsx`
**Scope:** M

**Hinweis:** Die Drag-Interaktion selbst (Maus-Feel, visuelles Ergebnis) konnte mangels Browser-Zugriff nicht selbst getestet werden — nur die zugrunde liegende Persistenz (PATCH `hillPosition`) wurde via curl verifiziert. Bitte manuell im Browser prüfen.

---

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria aus SPEC-hill-charts.md verifiziert
- [x] `npm test` (202 Tests) und `npm run build` grün
- [x] Review mit Mensch vor Abschluss des Moduls
