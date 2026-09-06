# Task List: tiered-tenant-infra

Siehe `tasks/plan-tiered-tenant-infra.md` und `SPEC-tiered-tenant-infra.md`.
**Grenze:** Nur ein Postgres-Container in dieser Umgebung — verifiziert
wurde die Mechanik (Tenant landet auf angegebener Connection-String),
keine echte physische Multi-Server-Trennung.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: `Tenant.tier`, Migration (Platform-DB)

## Phase 2: Provisionierung — ✅ erledigt
- [x] Task 2: `provisionTenant()` erweitert + Integrationstest (`tests/tieredTenantInfra.test.ts`, 2 Tests grün)

## Phase 3: API + UI — ✅ erledigt, via Docker verifiziert
- [x] Task 3: `POST /api/tenants` erweitert
- [x] Task 4: `/tenants/new` Tier-Auswahl + Ziel-Connection-String-Feld
- [x] Task 5: `/tenants`-Liste zeigt Tier

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (dedizierter Tenant landet nachweislich auf der angegebenen Connection-String statt dem Standard-Server, `tier` korrekt gespeichert, Badge in der Liste sichtbar)
- [x] `npm test` (347 Tests) und `npm run build` grün
- [x] Docker-Verifikation (Mechanik)
- [ ] Review mit Mensch vor Abschluss des Moduls
