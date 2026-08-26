# Spec: dynamic-shared-views (v2 Modul 7)

## Objective
Owner/Admin kann einen öffentlichen, schreibgeschützten Freigabe-Link für
ein Projekt erzeugen (optional nach Status-Kategorie gefiltert), der ohne
Login abrufbar ist — Smartsheet-Style "leichte externe Ansicht ohne vollen
Zugang".

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
prisma/tenant/schema.prisma                  → SharedView
src/tenant/sharedViews/sharedViewAccess.ts   → reine Gültigkeitsprüfung (revoked/expired)
src/app/api/tenant/projects/[id]/shared-views/route.ts       → GET/POST (nur owner/admin)
src/app/api/tenant/shared-views/[id]/route.ts                 → PATCH (revoke)
src/app/(tenant)/shared/[token]/page.tsx      → öffentliche, schreibgeschützte Ansicht (kein Login)
src/app/(tenant)/projects/[id]/list/          → UI-Erweiterung: Freigabe-Panel
tests/                                         → Unit + Integrationstest
```

## Code Style
Bestehende Muster: `canManageMembers`-Guard, `generateInviteToken()`-
artiges Zufalls-Token wiederverwenden, Field-Atlas-CSS.

## Testing Strategy
Vitest für die reine Gültigkeitsprüfung (revoked/expired/gültig).
Integrationstest: Link erstellen → öffentliche Route liefert gefilterte
Tasks; nach Widerruf liefert dieselbe Route 410. Docker-E2E: Link ohne
Cookies abrufen (echte Anonymität), Status-Filter greift, 403 für member
bei Link-Erstellung.

## Boundaries
- Always: Die öffentliche Route prüft NIE eine Session/Cookie — Zugriff
  ausschließlich über das Token in der URL.
- Ask first: Passwortschutz zusätzlich zum Token, granulare
  Spalten-Sichtbarkeit — außerhalb des v1-Scopes.
- Never: Interne Felder wie Kommentare, Zeiteinträge, Budgets oder
  Kundendaten in der Freigabe-Ansicht zeigen — nur Titel/Status/Zuständig/
  Fälligkeitsdatum.

## Success Criteria
- Owner/Admin kann einen Freigabe-Link mit optionalem Status-Kategorie-
  Filter erzeugen und bestehende Links einsehen/widerrufen.
- `/shared/[token]` ist ohne Cookie/Login abrufbar und zeigt nur die
  gefilterten Tasks des Projekts, rein lesend.
- Ein widerrufener oder abgelaufener Link liefert 410/eine
  entsprechende Fehleransicht.
- 403 für `member` bei Link-Erstellung/-Widerruf.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt.
