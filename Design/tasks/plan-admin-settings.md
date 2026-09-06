# Implementation Plan: admin-settings

## Overview
Ergänzt drei fehlende Tenant-interne Verwaltungsstücke: Währungs-Einstellung (Org-Settings), Mitglieder-Deaktivierung (statt Löschen), und ein Settings-Hub, der bestehende Bereiche zusammenführt. Rollen-Verwaltung selbst ist bereits durch `/members` abgedeckt.

## Architecture Decisions
- `User.isActive` (Default `true`) statt Löschen — bewahrt referenzielle Integrität (Kommentare, Zeiteinträge, Zuweisungen bleiben gültig).
- Login-Route prüft `isActive` zusätzlich zum bestehenden Passwort-Check, mit der gleichen generischen Fehlermeldung (kein Leak, ob ein Account existiert/deaktiviert ist — Sicherheits-Konsistenz mit dem bestehenden Login-Verhalten).
- `wouldDeactivateLastOwner()` ist eine eigenständige reine Funktion neben dem bestehenden `wouldRemoveLastOwner()` in `roleGuard.ts` — leicht unterschiedliche Semantik (Deaktivierung vs. Rollenwechsel), aber gleiches Schutzmuster.
- Die Währungs-Einstellung wird über die bereits bestehende `tenant-settings`-Route erweitert (kein neuer Endpunkt), da `TenantSettings` bereits die Singleton-Zeile ist.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema erweitern (`User.isActive`)

### Checkpoint: Schema
- [ ] Migration angewendet, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `wouldDeactivateLastOwner()` in `src/tenant/auth/roleGuard.ts` + Unit-Tests

### Phase 3: API + Login-Integration
- [ ] Task 3: Login-Route: Ablehnung für `isActive: false` (generische Fehlermeldung)
- [ ] Task 4: `PATCH /api/tenant/users/[id]/active` (nur owner/admin, kein Selbst-Deaktivieren, kein letzter Owner) + Integrationstest
- [ ] Task 5: `tenant-settings`-Route um `currency` erweitern

### Phase 4: UI
- [ ] Task 6: `/settings/organization/page.tsx` (Währung)
- [ ] Task 7: `/settings/page.tsx` (Hub) + Deaktivieren/Reaktivieren-Button in `MembersClient.tsx`

### Checkpoint: Abschluss
- [ ] Integrationstest grün
- [ ] `npm test` und `npm run build` grün
- [ ] Docker/curl: Deaktivierter Nutzer kann sich nicht einloggen, letzter Owner geschützt, Selbst-Deaktivierung blockiert, Währung änderbar, Hub verlinkt korrekt
- [ ] Review mit Mensch vor Abschluss des Moduls

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Deaktivierter Nutzer mit bestehender aktiver Session bleibt eingeloggt (Sessions werden nicht geprüft) | Mittel | Für v1 akzeptiert (Sessions laufen ohnehin ab); spätere Härtung könnte Sessions beim Deaktivieren invalidieren — als Hinweis dokumentiert, nicht in diesem Modul gelöst |
| Verwechslung von "letzter Owner" bei Deaktivierung vs. Rollenwechsel | Niedrig | Getrennte, klar benannte Funktion statt Wiederverwendung von `wouldRemoveLastOwner` mit falscher Semantik |

## Open Questions
Keine — Spec vom Menschen bestätigt.
