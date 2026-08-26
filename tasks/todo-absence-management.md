# Task List: absence-management

Siehe `tasks/plan-absence-management.md` und `SPEC-absence-management.md`.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: `AbsenceRequest`-Modell + Enums, Migration

## Checkpoint: Schema — ✅ erreicht
- [x] Migration, Build grün

## Phase 2: Reine Logik — ✅ erledigt
- [x] Task 2: `countBusinessDays()` + `computeCreditedHours()` + Tests (7 Tests grün)

## Phase 3: API — ✅ erledigt, via Docker verifiziert
- [x] Task 3: `POST`/`GET /api/tenant/absence-requests` (inkl. `?all=true` Queue für Admin)
- [x] Task 4: `PATCH /api/tenant/absence-requests/[id]` + Integrationstest (`tests/absenceManagement.test.ts`, 2 Tests grün)

## Phase 4: UI — ✅ erledigt, via Docker verifiziert
- [x] Task 5: `/time/absence` Antragsformular + eigene Anträge (ersetzt Platzhalter)
- [x] Task 6: Genehmigungs-Queue für Admin/Owner auf derselben Seite

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (Antrag stellen, 403 bei `?all=true` und PATCH für member, Genehmigung durch Owner leert Queue, Status-Pill rendert korrekt)
- [x] `npm test` (235 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
