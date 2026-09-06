# Task List: client-portal

Siehe `tasks/plan-client-portal.md` und `SPEC-client-portal.md`.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: `Role.client`, `ProjectClientAccess`, `Invite.grantedProjectIds`, Migration

## Phase 2: Reine Logik — ✅ erledigt
- [x] Task 2: `hasProjectAccess()` + Tests (3 Tests grün)

## Phase 3: API/Proxy — ✅ erledigt, via Docker verifiziert
- [x] Task 3: Invite-Route erweitert, Accept-Invite legt `ProjectClientAccess` an + Integrationstest (`tests/clientPortalAccess.test.ts`, 1 Test grün)
- [x] Task 4: `proxy.ts` Redirect-Durchsetzung + Test für `isAllowedForClient()` (`tests/proxyClientAllowlist.test.ts`, 3 Tests grün)

## Phase 4: UI — ✅ erledigt, via Docker verifiziert
- [x] Task 5: Mitglieder-Seite — Rolle "client" + Projekt-Auswahl beim Einladen
- [x] Task 6: `/portal` Projektliste
- [x] Task 7: `/portal/[projectId]` Task-Liste (read-only) + Rechnungen (nur sent/paid)

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (Client wird von /dashboard, /projects zu /portal umgeleitet; /portal zeigt nur freigegebene Projekte; nicht freigegebenes Projekt leitet um; Draft-Rechnung unsichtbar, versendete sichtbar mit korrektem Betrag)
- [x] `npm test` (295 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls

## Bekannte Grenze (bewusst dokumentiert, kein offener Bug)
Bestehende "Zuständige Person"-Dropdowns (Task-Zuweisung etc.) filtern
Client-User nicht heraus — ein Admin könnte theoretisch einen Client als
Assignee wählen. War von Anfang an als Grenze im Spec festgehalten.
