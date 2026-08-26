# Spec: baseline-diffing (v2 Modul 15, letztes Modul der v2-Roadmap)

## Objective
Für ein Projekt lässt sich ein "Baseline"-Snapshot des aktuellen Zeitplans
(Fälligkeitsdatum, geschätzte Stunden, Status-Kategorie je Task) anlegen. Später
kann dieser Snapshot mit dem aktuellen Ist-Stand verglichen werden, um
Terminverschiebungen (Schedule Slip) und Scope-Änderungen sichtbar zu machen —
analog zu Baselines in klassischen Projektplan-Tools, hier aber auf Basis der
bestehenden Task-Daten.

## Assumptions (zu bestätigen)
1. Eine Baseline ist projektbezogen (`Baseline.projectId`) und enthält eine
   feste Momentaufnahme: pro Task zum Snapshot-Zeitpunkt `dueDate`,
   `estimatedHours`, `statusCategory` (`BaselineTaskSnapshot`).
2. Baselines werden nie automatisch aktualisiert — sie sind unveränderliche
   Snapshots (append-only), vergleichbar mit Git-Tags.
3. Der Diff wird live berechnet (reine Funktion `computeBaselineDiff()`):
   für jeden Task im Snapshot wird das aktuelle `dueDate`/`estimatedHours`/
   `statusCategory` verglichen; Tasks, die seit dem Snapshot gelöscht wurden,
   werden als "entfernt" markiert; neue Tasks (nicht im Snapshot) werden nicht
   im Diff aufgeführt (Baseline zeigt nur Abweichungen vom ursprünglichen Plan,
   kein vollständiger Sync-Report).
4. Nur `owner`/`admin` (canManageMembers) dürfen Baselines anlegen.

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant DB), Vitest.

## Commands
Build: `npm run build`
Test: `npm test`
Migrate: `npx prisma migrate dev --config prisma.tenant.config.ts --name <name>`

## Project Structure
- `src/tenant/baselines/computeBaselineDiff.ts` — reine Diff-Berechnung
- `src/app/api/tenant/projects/[id]/baselines/route.ts` (GET-Liste, POST-Snapshot)
- `src/app/api/tenant/baselines/[id]/route.ts` (GET inkl. Diff)
- `src/app/(tenant)/projects/[id]/baselines/page.tsx`, `.../[baselineId]/page.tsx`
- `tests/computeBaselineDiff.test.ts`, `tests/baselines.test.ts`

## Code Style
Folgt dem Muster aus `cycleInsights.ts`/`portfolioProgress.ts` — reine Funktion,
keine DB-Zugriffe.

## Testing Strategy
Vitest Unit-Test für die reine Diff-Funktion, Integrationstest über
`provisionTenant()`/`getTenantDbClient()`, Docker-E2E via curl.

## Boundaries
- Always: Baseline-Snapshots sind unveränderlich (kein PATCH/UPDATE, nur Erstellen/Lesen).
- Ask first: Schema-Änderungen außerhalb dieses Moduls.
- Never: Baselines automatisch aktualisieren.

## Success Criteria
- Baseline für ein Projekt anlegen → Snapshot aller aktuellen Tasks gespeichert.
- Task-Fälligkeitsdatum nach Snapshot ändern → Diff zeigt Verschiebung korrekt an.
- Docker-E2E grün.
