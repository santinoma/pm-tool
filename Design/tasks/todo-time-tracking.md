# Task List: time-tracking

Siehe `tasks/plan-time-tracking.md` und `SPEC-time-tracking.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `TenantSettings`, `TimeEntry` ins Tenant-Schema.
**Acceptance:** Migration lässt sich anwenden.
**Verify:** `npm run db:tenant:migrate`
**Files:** `prisma/tenant/schema.prisma`
**Scope:** S

---

## Phase 2: Reine Logik

### Task 2: duration.ts — ✅ erledigt
**Beschreibung:** `computeDurationMinutes(start, end)`, `aggregateByTask(entries)`, `aggregateByProject(entries, taskProjectLinks)` (nur `isPrimary`-Links zählen), `validateEntryTarget({taskId, projectId}, allowProjectLevel)`.
**Acceptance:** Aggregation über Cross-Tagging-Tasks zählt Projekt-Zeit nicht doppelt; Validierung lehnt sowohl "beides leer" als auch "projectId ohne Erlaubnis" ab.
**Verify:** `tests/timeTrackingDuration.test.ts`
**Files:** `src/tenant/timeTracking/duration.ts`, `tests/timeTrackingDuration.test.ts`
**Scope:** S

---

## Checkpoint: Logik-Grundlagen — ✅ erreicht
- [x] Unit-Tests grün
- [x] `npm run build` grün

## Phase 3: Einstellungen & Timer

### Task 3: Tenant-Settings — ✅ erledigt
**Beschreibung:** `getOrCreateTenantSettings(tenantDb)`, `GET/PATCH /api/tenant/tenant-settings`, einfache Einstellungsseite mit Checkbox.
**Acceptance:** Erster Aufruf erzeugt die Singleton-Zeile mit Default `false`; PATCH ändert sie.
**Verify:** `tests/tenantSettings.test.ts`
**Files:** `src/tenant/timeTracking/tenantSettings.ts`, `src/app/api/tenant/tenant-settings/route.ts`, `src/app/(tenant)/settings/time-tracking/page.tsx`, `tests/tenantSettings.test.ts`
**Scope:** S

---

### Task 4: Timer Start/Stop — ✅ erledigt, Auto-Stop via Docker verifiziert
**Beschreibung:** `POST /api/tenant/timer/start` (taskId oder projectId; stoppt vorherigen laufenden Timer desselben Nutzers zuerst), `POST /api/tenant/timer/stop`.
**Acceptance:** Zweiter Start-Aufruf beendet den ersten Timer mit korrekter Dauer, bevor der neue beginnt.
**Verify:** `tests/timer.test.ts`
**Files:** `src/app/api/tenant/timer/start/route.ts`, `src/app/api/tenant/timer/stop/route.ts`, `tests/timer.test.ts`
**Scope:** M

---

## Phase 4: Manuelle Einträge & Übersicht

### Task 5: Manuelle Zeiteinträge — ✅ erledigt, Projektebene-Ablehnung/-Erlaubnis via Docker verifiziert
**Beschreibung:** `POST/GET /api/tenant/time-entries`, `PATCH/DELETE /api/tenant/time-entries/[id]`. POST validiert über `validateEntryTarget` gegen die aktuelle `TenantSettings`.
**Acceptance:** Eintrag mit `projectId` ohne `taskId` wird abgelehnt, wenn die Einstellung aus ist — auch bei direktem API-Aufruf, nicht nur im UI verhindert.
**Verify:** `tests/timeEntries.test.ts`
**Files:** `src/app/api/tenant/time-entries/route.ts`, `src/app/api/tenant/time-entries/[id]/route.ts`, `tests/timeEntries.test.ts`
**Scope:** M

---

### Task 6: Zeiterfassungs-Seite — ✅ erledigt (inkl. eines gefundenen und behobenen Bugs: laufender Timer und manuelle Einträge waren durch identisches `endedAt: null` nicht unterscheidbar — Fix: `startedAt: { not: null }` als zusätzliches Kriterium)
**Beschreibung:** `time/page.tsx` — laufender Timer prominent (mit Stop-Button), Liste eigener Einträge, Formular für manuellen Eintrag.
**Acceptance:** Laufender Timer ist sichtbar und stoppbar; neuer manueller Eintrag erscheint sofort in der Liste.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/(tenant)/time/page.tsx`, `src/app/(tenant)/time/TimeTrackingClient.tsx`
**Scope:** M

---

## Checkpoint: Abschluss — ✅ code-seitig erreicht
- [x] Manuell/E2E via Docker: Timer-Auto-Stop, manueller Eintrag, Aggregation, Projektebene-Ablehnung/-Erlaubnis, Seite zeigt beide Eintragsarten korrekt getrennt
- [x] `npm test` (115 Tests) und `npm run build` grün
- [ ] Review mit Mensch vor Abschluss des Moduls
