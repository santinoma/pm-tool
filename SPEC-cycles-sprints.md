# Spec: cycles-sprints + cycle-insights (v2 Modul 4)

## Objective
Linear-Style Cycles (Sprints) pro Projekt: Tasks werden einem Cycle
zugeordnet, am Ende zeigt eine Insights-Ansicht Velocity (erledigte
`estimatedHours`) und Scope Creep (nach Cycle-Start hinzugefügte Tasks).

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
prisma/tenant/schema.prisma                  → Cycle, Task.cycleId/cycleAssignedAt
src/tenant/cycles/cycleInsights.ts           → reine Velocity/Scope-Creep-Berechnung
src/app/api/tenant/projects/[id]/cycles/route.ts        → GET/POST
src/app/api/tenant/cycles/[id]/route.ts                 → GET (mit Tasks+Insights)
src/app/api/tenant/tasks/[id]/route.ts                  → PATCH erweitert um cycleId
src/app/(tenant)/projects/[id]/cycles/                  → Liste + Anlegen
src/app/(tenant)/projects/[id]/cycles/[cycleId]/        → Detail + Insights
src/ui/shell/ProjectSubnav.tsx               → neuer Tab "Cycles"
tests/                                        → Unit + Integrationstest
```

## Code Style
Bestehende Muster: `canManageMembers`-Guard für Cycle-Anlage,
Field-Atlas-CSS, `ProjectSubnav`-Tab-Muster (wie bei `showTriage`).

## Testing Strategy
Vitest für die reine Insights-Funktion (Velocity, Scope-Creep-% aus
Task-Rohdaten). Integrationstest: Task-Zuordnung vor/nach Cycle-Start
ergibt korrekten Scope-Creep-Anteil. Docker-E2E: Cycle anlegen, Tasks
zuordnen, Insights prüfen, 403 für member bei Cycle-Anlage.

## Boundaries
- Always: Höchstens ein Cycle pro Task (`Task.cycleId` einfache FK, kein
  Join-Modell).
- Ask first: Automatisches Cycle-Rollover (unerledigte Tasks automatisch
  in den nächsten Cycle verschieben) — bewusst außerhalb des v1-Scopes.
- Never: Bestehende Story-Points/Estimation-Felder duplizieren —
  `estimatedHours` ist die einzige Velocity-Grundlage.

## Success Criteria
- Owner/Admin kann einen Cycle anlegen (Name, Start-/Enddatum).
- Jeder kann einem Task über die Task-Detailseite einen Cycle zuweisen.
- Ein Task, der nach dem Cycle-Start zugeordnet wurde, zählt als Scope
  Creep; davor zugeordnete Tasks zählen als geplanter Scope.
- Velocity = Summe `estimatedHours` der Tasks mit Status-Kategorie "done".
- Cycle-Detailseite zeigt Task-Liste, Velocity, Scope-Creep-% und
  erledigt/gesamt korrekt.
- 403 für `member` beim Anlegen eines Cycles.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt.
