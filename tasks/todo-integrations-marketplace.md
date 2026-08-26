# Task List: integrations-marketplace

Siehe `tasks/plan-integrations-marketplace.md` und `SPEC-integrations-marketplace.md`.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: `ApiKey`, `WebhookEndpoint.integrationTemplateKey`, Migration

## Phase 2: Reine Logik — ✅ erledigt
- [x] Task 2: `generateApiKey()`/`hashApiKeyToken()` + Tests (6 Tests grün)

## Phase 3: API-Key-Verwaltung — ✅ erledigt, via Docker verifiziert
- [x] Task 3: CRUD-Routen + Integrationstest (`tests/apiKeyAuth.test.ts`, 3 Tests grün)

## Phase 4: Öffentliche API — ✅ erledigt, via Docker verifiziert
- [x] Task 4: `authenticateApiKey()`-Helper
- [x] Task 5: `/api/v1/projects`, `/api/v1/tasks` (GET/POST)

## Phase 5: Marktplatz — ✅ erledigt, via Docker verifiziert
- [x] Task 6: Vorlagen-Liste + Installieren-Route (`/api/tenant/integrations`)
- [x] Task 7: Marktplatz-Seite + API-Key-UI in Settings → Security

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (API-Key erstellen → /api/v1 funktioniert → Task per API angelegt und gelistet → Widerruf sofort wirksam (401); Marktplatz-Installation legt sichtbaren WebhookEndpoint an, "Installiert"-Status korrekt; 403 für member bei Installation)
- [x] `npm test` (345 Tests) und `npm run build` grün
- [x] Docker-Verifikation

## Hinweis
Postgres hatte während der Testläufe erneut kurze Aussetzer (Docker/Host-
bedingt) — nach Stabilisierung liefen alle 345 Tests durchgehend grün.

- [ ] Review mit Mensch vor Abschluss des Moduls
