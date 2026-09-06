# Task List: baseline-diffing

Siehe `SPEC-baseline-diffing.md`.

## Phase 1: Datenmodell
- [x] Task 1: `Baseline`, `BaselineTaskSnapshot`, Migration

## Phase 2: Reine Logik
- [x] Task 2: `computeBaselineDiff()` + Tests

## Phase 3: API
- [x] Task 3: `POST/GET /api/tenant/projects/[id]/baselines`
- [x] Task 4: `GET /api/tenant/baselines/[id]` (inkl. Diff)
- [x] Task 5: Integrationstest

## Phase 4: UI
- [x] Task 6: Baseline-Liste + Detailseite mit Diff-Ansicht im Projekt

## Checkpoint: Abschluss
- [x] Success-Criteria verifiziert, Tests+Build grün, Docker-Verifikation, Review

### Docker-E2E-Verifikation (2026-08-26)
- Tenant provisioniert, Projekt "Roadmap" mit einem Task (dueDate 2026-01-01,
  estimatedHours 10, Status "Todo") angelegt.
- Baseline-Snapshot "Kickoff plan" erstellt → Snapshot enthält den Task korrekt.
- Task anschließend geändert: dueDate → 2026-01-15, estimatedHours → 15,
  Status → "Done".
- `GET /api/tenant/baselines/[id]` liefert korrekten Diff: `dueDateShiftDays: 14`,
  `estimatedHoursDelta: 5`, `statusChanged: true`, `not_started → done`.
- `/projects/[id]/baselines` und `.../baselines/[baselineId]` rendern 200.
- Tenant anschließend über `DELETE /api/tenants/[id]` bereinigt.

### Hinweis: Testumgebungsinstabilität während dieses Moduls
Während der Testverifikation ist die dev-Postgres-Instanz erneut unter ~2166
verwaisten Test-Datenbanken (aus vorherigen Testläufen) zusammengebrochen
(Checkpoint-Sync bis zu 92s, `DROP DATABASE`-Fehler wegen Last). Nach Rückfrage
wurden die verwaisten DBs per Bulk-SQL (`DROP DATABASE ... WITH (FORCE)`)
bereinigt. Die volle Testsuite lief danach unter reduzierter Parallelität
(`npx vitest run --maxWorkers=2`) grün durch (371/371) — bestätigt, dass die
Fehlschläge rein umgebungsbedingt (I/O-Sättigung durch Testparallelität) waren,
keine Regression durch dieses Modul.
