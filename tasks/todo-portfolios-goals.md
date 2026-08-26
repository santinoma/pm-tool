# Task List: portfolios-goals

Siehe `SPEC-portfolios-goals.md`.

## Phase 1: Datenmodell
- [x] Task 1: `Portfolio`, `Goal`, `Project.portfolioId`, Migration

## Phase 2: Reine Logik
- [x] Task 2: `computePortfolioProgress()` + Tests

## Phase 3: API
- [x] Task 3: Portfolio-CRUD-Routen (inkl. Projekt-Zuordnung)
- [x] Task 4: Goal-CRUD-Routen
- [x] Task 5: Integrationstest

## Phase 4: UI
- [x] Task 6: `/portfolios` Liste + Detailseite mit Goals und Fortschritt

## Checkpoint: Abschluss
- [x] Success-Criteria verifiziert, Tests+Build grün, Docker-Verifikation, Review

### Docker-E2E-Verifikation (2026-08-26)
- Tenant provisioniert, 2 Projekte (Alpha, Beta) angelegt, Portfolio erstellt,
  beide Projekte zugeordnet, Goal "Ship v2" angelegt.
- Task in Alpha auf Status-Kategorie `done` gesetzt, Task in Beta bleibt `not_started`
  → `GET /api/tenant/portfolios/[id]` liefert `progress: 50` (live berechnet, korrekt).
- Goal-Status via `PATCH /api/tenant/goals/[id]` auf `at_risk` aktualisiert.
- `/portfolios` und `/portfolios/[id]` rendern 200.
- Tenant anschließend über `DELETE /api/tenants/[id]` bereinigt.

### Hinweis: Whiteboards gestrichen
Whiteboards wurde per Nutzerentscheidung aus dem v2-Scope entfernt (zu hoher
Aufwand für Freihand-Canvas/Echtzeit-Sync in dieser Umgebung, kein sinnvoller
abgespeckter Ersatz identifiziert). Baseline-diffing folgt als eigenes Modul.
