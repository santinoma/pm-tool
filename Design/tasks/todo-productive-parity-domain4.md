# Task List: Produktiv-Parität Domäne 4 (Foundations)

Quelle: `tasks/plan-productive-parity-roadmap.md`, Domäne 4. Scope leicht
angepasst: "Login-Zugriff entziehen (Seat-erhaltend)" existierte bereits
(`isActive`-Flag + `/api/tenant/users/[id]/active`-Route), daher nicht neu
gebaut. "Offboarding-Workflow" und "kaskadierende Permission-Abhängigkeiten"
wurden zunächst zurückgestellt, dann im selben Durchgang nachgeliefert
(siehe unten).

## Sitzungs-/Geräteverwaltung + Audit-Log — ✅ erledigt
- [x] `Session.userAgent`/`lastSeenAt`, gedrosseltes Touch (max. alle 5 Min,
  nicht bei jedem Request — dokumentiert)
- [x] `GET/DELETE /api/tenant/sessions` — eigene Sitzungen auflisten/
  widerrufen (403 bei fremder Sitzung)
- [x] UI: "Aktive Sitzungen" in `settings/security`
- [x] `AuditLogEntry`-Modell, bewusst getrennt von `ActivityEvent` (das
  bleibt projekt-/task-bezogen für Benachrichtigungen)
- [x] Verdrahtet in: Rollenänderung, Aktivierung/Deaktivierung,
  API-Key-Erstellung/-Widerruf, SSO-Konfig-Änderungen, Custom-Role-
  Berechtigungsänderungen — bewusst nur sicherheitsrelevante Aktionen,
  kein Instrumentieren der gesamten Codebase
- [x] Tests: `sessionManagement.test.ts` + `auditLog.test.ts` (10 Tests)

## Quick Add + Favoriten + Manager-Zuweisung + Org-Chart — ✅ erledigt
- [x] Quick Add als dritter Tab in der BESTEHENDEN Cmd+K-Palette (keine neue
  Overlay-UI) — Task/Wiki-Erstellung navigiert zum zuletzt erstellten
  Projekt (kein Projekt-Kontext in der Palette verfügbar)
- [x] `Favorite`-Modell, idempotent (Unique-Constraint), Stern-Toggle auf
  Projekt-Karten und Task-Detail-Sidebar, "Favoriten"-Dropdown im AppShell
- [x] `User.managerId` (Self-Relation), Zyklus-Erkennung
  (`wouldCreateManagerCycle`), Selbst-Zuweisung abgelehnt
- [x] `/members/org-chart` — einfache eingerückte Liste (bewusst kein
  grafischer Baum)
- [x] Tests: `favorites.test.ts` + `managerAssignment.test.ts` (7 Tests)
- **Gefundener und behobener Bug**: ein paralleler Agent (Session/Audit-Log)
  bemerkte, dass `managerId` zwar validiert aber nicht im Update-Payload
  landete — vom zuständigen Agenten selbst korrigiert, in der zentralen
  Verifikation bestätigt (`managerId: hasManagerId ? body.managerId : undefined`
  ist jetzt im `user.update`-Aufruf enthalten).

## Offboarding-Workflow — ✅ nachgeliefert (2026-08-27)
- [x] `POST /api/tenant/users/[id]/offboard` — deaktiviert (`isActive: false`),
  überträgt Eigentümerschaft (Budgets, verwaltete Projekte, offene Tasks,
  Automation-Rules, Resource-Bookings, geteilte Saved Views, Saved
  Reports) an einen optionalen Nachfolger; private Saved Views werden
  gelöscht (bewusste Design-Entscheidung), API-Keys werden widerrufen
  statt übertragen (Sicherheits-Antipattern vermieden), Projekt-
  Mitgliedschaften entfernt
- [x] `GET .../ownership-summary` — zeigt vor dem Offboarden, was die
  Person besitzt
- [x] UI: "Offboarden"-Button + Bestätigungs-Modal auf der Mitglieder-Seite
- [x] Test: `offboarding.test.ts` (6 Tests), Docker-E2E bestätigt
  (Login nach Offboarding korrekt blockiert)

## Kaskadierende Permission-Abhängigkeiten — ✅ nachgeliefert (2026-08-27)
- [x] `PERMISSION_DEPENDENCIES`-Graph (z.B. `automations_manage` →
  `workflows_manage` → `projects_manage`), `resolveWithDependencies()`
  (transitiver Abschluss beim Aktivieren) und `blockingDependents()`
  (Kaskaden-Deaktivierung mit Hinweistext, kein hartes Blockieren)
- [x] Serverseitig durchgesetzt in Rollen-Erstellung/-Update (nicht nur
  Client-UX-Zucker)
- [x] Test: `permissionDependencies.test.ts` (11 Tests), Docker-E2E
  bestätigt (Anlegen einer Rolle mit nur `automations_manage` liefert
  automatisch `workflows_manage`+`projects_manage` mit)

## Umsetzung: 3 + 2 parallele Agenten (2026-08-27)
Zentral verifiziert: Build + volle Testsuite grün (727/727, davon 22 neue
Tests seit dem Session/Audit-Log-Commit), Docker-E2E (eigene Sitzung
sichtbar, Audit-Log erreichbar, Selbst-Manager-Zuweisung 400, Org-Chart/
Audit-Log/Security-Seiten rendern, Offboarding blockiert Login, Rollen-
Erstellung erweitert Berechtigungen serverseitig korrekt). 251 verwaiste
Test-DBs bereinigt.

## Checkpoint: Abschluss
- [x] Tests+Build grün (727/727), Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
