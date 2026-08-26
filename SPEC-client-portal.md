# Spec: client-portal (v2 Modul 6)

## Objective
Externe Kunden bekommen einen eigenen, eingeschränkten Login: eine neue
Rolle `client` mit Zugriff nur auf explizit freigegebene Projekte, in
einem eigenen minimalen Portal-Bereich (`/portal`) — schreibgeschützte
Task-Liste + versendete/bezahlte Rechnungen, kein Zugriff auf interne
Seiten.

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
prisma/tenant/schema.prisma                 → Role.client, ProjectClientAccess, Invite.grantedProjectIds
src/tenant/portal/portalAccess.ts           → reine Zugriffsprüfung (hat User X Zugriff auf Projekt Y)
src/proxy.ts                                → zentrale Client-Redirect-Durchsetzung
src/app/(tenant)/members/                   → UI-Erweiterung: Rolle "client" + Projekt-Auswahl beim Einladen
src/app/(tenant)/portal/                    → neuer Portal-Bereich (Projektliste, Projekt-Detail read-only)
tests/                                       → Unit + Integrationstest
```

## Code Style
Bestehende Muster: `canManageMembers`-Guard, Invite-Flow aus
`identity-org` wiederverwendet und erweitert, Field-Atlas-CSS.

## Testing Strategy
Vitest für die reine Zugriffsprüfung. Integrationstest: Client-Invite mit
Projekt-Auswahl → Annahme → `ProjectClientAccess`-Einträge korrekt;
schreibgeschützte Portal-Route liefert nur freigegebene Projekte. Docker-E2E:
Client einladen, einloggen, `/dashboard` wird zu `/portal` umgeleitet,
nicht freigegebenes Projekt liefert 403/Umleitung, versendete Rechnung
sichtbar, Entwurf nicht.

## Boundaries
- Always: Redirect-Durchsetzung zentral in `proxy.ts`, nicht pro Seite.
- Ask first: Kommentar-/Schreibrechte für Clients, Board/Drag'n'Drop im
  Portal — bewusst außerhalb des v1-Scopes.
- Never: Draft-Rechnungen, interne Kostensätze oder andere Kunden/Projekte
  im Portal sichtbar machen.

## Success Criteria
- Owner/Admin kann über die Mitglieder-Seite einen Client mit
  Projekt-Auswahl einladen.
- Ein Client-User wird bei jedem Versuch, eine interne Seite aufzurufen,
  zu `/portal` umgeleitet.
- `/portal` zeigt nur die freigegebenen Projekte; ein Projekt-Detail zeigt
  eine schreibgeschützte Task-Liste und nur `sent`/`paid`-Rechnungen.
- Ein Zugriffsversuch auf ein nicht freigegebenes Projekt im Portal wird
  abgelehnt.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt. Bekannte Grenze: bestehende
Assignee-Dropdowns filtern Clients nicht heraus (siehe Boundaries).
