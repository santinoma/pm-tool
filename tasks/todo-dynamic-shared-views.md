# Task List: dynamic-shared-views

Siehe `tasks/plan-dynamic-shared-views.md` und `SPEC-dynamic-shared-views.md`.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: `SharedView`-Modell, Migration

## Phase 2: Reine Logik — ✅ erledigt
- [x] Task 2: `isSharedViewValid()` + Tests (5 Tests grün)

## Phase 3: API — ✅ erledigt, via Docker verifiziert
- [x] Task 3: `GET`/`POST /api/tenant/projects/[id]/shared-views` (nur owner/admin)
- [x] Task 4: `PATCH /api/tenant/shared-views/[id]` (revoke) + Integrationstest (`tests/sharedViews.test.ts`, 2 Tests grün)

## Phase 4: UI — ✅ erledigt, via Docker verifiziert
- [x] Task 5: Freigabe-Panel auf `/projects/[id]/list` (erstellen/anzeigen/widerrufen)
- [x] Task 6: `/shared/[token]` öffentliche schreibgeschützte Ansicht (proxy.ts-Allowlist ergänzt)

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (echt anonymer Abruf ohne Cookies funktioniert, Status-Kategorie-Filter greift korrekt, Widerruf zeigt sofort Fehlermeldung, 403 für member bei Link-Erstellung)
- [x] `npm test` (302 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
