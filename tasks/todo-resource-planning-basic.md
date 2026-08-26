# Task List: resource-planning-basic

Siehe `tasks/plan-resource-planning-basic.md` und `SPEC-resource-planning-basic.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `Task` erhält `estimatedHours` (Float?); `User` erhält `weeklyCapacityHours` (Float, Default 40).
**Acceptance:** Migration lässt sich anwenden, bestehende Tasks/Users bleiben unverändert lesbar.
**Verify:** `npm run db:tenant:migrate`
**Files:** `prisma/tenant/schema.prisma`
**Scope:** S

---

## Checkpoint: Schema — ✅ erreicht
- [x] Migration angewendet, `npm run build` grün

## Phase 2: Reine Logik

### Task 2: `getCurrentWeekRange()` — ✅ erledigt
**Beschreibung:** Reine Funktion, liefert UTC-sicheren Start (Montag 00:00 UTC) und Ende (Sonntag 23:59:59 UTC) der Woche, die ein gegebenes Datum enthält.
**Acceptance:** Korrekte Woche für Werte an beiden Wochenrändern (Montag 00:00 UTC, Sonntag 23:59 UTC).
**Verify:** `tests/resourcePlanningWeek.test.ts`
**Files:** `src/tenant/resourcePlanning/week.ts`, `tests/resourcePlanningWeek.test.ts`
**Scope:** S

### Task 3: `computeUtilization()` — ✅ erledigt
**Beschreibung:** Reine Funktion, nimmt Tasks (nur `estimatedHours`) + `weeklyCapacityHours` entgegen, liefert `{ plannedHours, utilizationPercent }`.
**Acceptance:** Leeres Array → `plannedHours = 0`; Tasks ohne `estimatedHours` zählen als 0; `utilizationPercent` korrekt berechnet, `0` bei Kapazität `0` (keine Division durch 0).
**Verify:** `tests/resourcePlanningUtilization.test.ts`
**Files:** `src/tenant/resourcePlanning/utilization.ts`, `tests/resourcePlanningUtilization.test.ts`
**Scope:** S

---

## Phase 3: API + UI

### Task 4: Kapazitäts-API-Route — ✅ erledigt, via Docker verifiziert (403 für member, 200 für owner)
**Beschreibung:** `PATCH /api/tenant/users/[id]/capacity` aktualisiert `weeklyCapacityHours`, nur für `owner`/`admin`.
**Acceptance:** PATCH durch `owner`/`admin` erfolgreich; durch `member` → 403.
**Verify:** `tests/resourcePlanning.test.ts`
**Files:** `src/app/api/tenant/users/[id]/capacity/route.ts`, `tests/resourcePlanning.test.ts`
**Scope:** S

### Task 5: Resource-Planning-Seite — ✅ erledigt, via Docker verifiziert (Cross-Projekt-Aggregation, Ausschluss ohne dueDate)
**Beschreibung:** `/resource-planning/page.tsx` listet alle Personen mit `plannedHours`/Kapazität für die aktuelle Woche (Tasks über alle Projekte, zugewiesen, nicht `done`, `dueDate` in der Woche); Drill-down zeigt zugrunde liegende Tasks inkl. Projektname; Kapazitäts-Bearbeitung nur für owner/admin.
**Acceptance:** Anzeige und Bearbeitung funktionieren manuell im Browser/Docker; Aggregation über mehrere Projekte korrekt.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/(tenant)/resource-planning/page.tsx`, `src/app/(tenant)/resource-planning/ResourcePlanningClient.tsx`
**Scope:** M

**Hinweis (nicht Teil dieses Moduls, notiert für später):** `estimatedHours` ist jetzt über `PATCH /api/tenant/tasks/[id]` setzbar (analog zu `dueDate`/`startDate`), aber es gibt noch kein UI-Eingabefeld dafür auf der Task-Detail-Seite — genau wie `dueDate`/`startDate` dort bislang auch nur über die Gantt-Ansicht gesetzt werden, nicht über ein Formularfeld. Eine spätere Aufgabe könnte alle drei Felder gemeinsam auf der Task-Detail-Seite editierbar machen.

---

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria aus SPEC-resource-planning-basic.md verifiziert
- [x] `npm test` (151 Tests) und `npm run build` grün
- [x] Review mit Mensch vor Abschluss des Moduls
