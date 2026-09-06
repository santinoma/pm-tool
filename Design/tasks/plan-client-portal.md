# Implementation Plan: client-portal

## Overview
`Role` bekommt einen vierten Wert `client`. `ProjectClientAccess`
(projectId, userId) ist die Zugriffs-Quelle der Wahrheit. `Invite`
bekommt `grantedProjectIds String[]`, die beim Annehmen in
`ProjectClientAccess`-Zeilen kopiert werden. Durchsetzung läuft zentral
in `proxy.ts` per Session-Lookup.

## Architecture Decisions
- `proxy.ts` liest bei jedem Request (außer Auth-/Portal-Pfaden) die
  Session aus dem Cookie, lädt den User aus der Tenant-DB und leitet bei
  `role === "client"` auf `/portal` um — verhindert, dass jede der ~40
  bestehenden internen Seiten einzeln angepasst werden muss.
- `ProjectClientAccess` ist viele-zu-viele (nicht ein einzelnes
  `projectId`-Feld auf User), da ein Kundenkontakt mehrere Projekte
  derselben Firma begleiten kann.
- Portal-Rechnungsliste filtert serverseitig auf `status IN (sent, paid)`
  — Entwürfe existieren für den Client nicht.
- Portal-Task-Liste ist bewusst read-only (keine PATCH-Routen vom Portal
  aus erreichbar) — kein neuer Schreib-Zugriffspfad für Clients in v1.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `Role.client`, `ProjectClientAccess`, `Invite.grantedProjectIds`, Migration

### Checkpoint: Schema
- [ ] Migration, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `hasProjectAccess()` + Tests

### Phase 3: API/Proxy
- [ ] Task 3: `POST /api/tenant/invites` erweitert um `grantedProjectIds`; Accept-Invite legt `ProjectClientAccess`-Zeilen an
- [ ] Task 4: `proxy.ts` Client-Redirect-Durchsetzung + Integrationstest

### Checkpoint: Durchsetzung
- [ ] Tests grün, Docker: Client wird von interner Seite umgeleitet

### Phase 4: UI
- [ ] Task 5: Mitglieder-Seite — Rolle "client" + Projekt-Multiselect beim Einladen
- [ ] Task 6: `/portal` Projektliste
- [ ] Task 7: `/portal/[projectId]` read-only Task-Liste + Rechnungen (nur sent/paid)

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Proxy-Session-Lookup verlangsamt jeden Request | Niedrig-Mittel | Nur ein indiziertes Session+User-Lookup, analog zum bestehenden Tenant-Lookup pro Request |
| Assignee-Dropdowns zeigen weiterhin Clients (bekannte Grenze) | Niedrig | Im Spec dokumentiert, nicht stillschweigend übergangen |

## Open Questions
Keine.
