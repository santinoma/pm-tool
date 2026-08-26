# Implementation Plan: identity-org

## Overview
Baut Login/Session/Einladungen und Rollen innerhalb einer Tenant-Datenbank. Erweitert `provisionTenant` um die automatische Owner-Einladung. Alle Auth-Grundlagen (Passwort, Session, Invite) werden als reine, unit-testbare Funktionen gebaut, getrennt von der DB-/HTTP-Anbindung — Fortführung des in `tenant-provisioning` etablierten Musters.

## Architecture Decisions
- **Reine Funktionen für Kryptographie/Token-Logik** (Hashing, Token-Generierung, Ablauf-Prüfung), damit sie ohne echte DB getestet werden können
- **Tenant-Kontext über einen zentralen `context.ts`-Helper**, der aus den von `proxy.ts` gesetzten Headern (`x-tenant-id`, `x-tenant-subdomain`) den passenden `tenantDb`-Client auflöst — jede spätere Route/Seite nutzt genau diesen einen Helper, keine Streuung der Header-Lese-Logik
- **provisionTenant wird erweitert, nicht dupliziert:** die Owner-Invite-Erzeugung hängt sich direkt an den bestehenden Erfolgspfad, nach der Migration, in derselben Transaktion/Funktion

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema um `User`, `Session`, `Invite`, `Team`, `TeamMember` erweitern + Migration

### Phase 2: Auth-Grundlagen (reine Logik)
- [ ] Task 2: `password.ts` (bcryptjs Hash/Verify)
- [ ] Task 3: `invite.ts` (Token-Generierung, Ablauf-/Angenommen-Prüfung)
- [ ] Task 4: `session.ts` (Session-Erzeugung/-Cookie-Parsing/-Ablauf)

### Checkpoint: Auth-Grundlagen
- [ ] Unit-Tests für Task 2-4 grün
- [ ] `npm run build` grün

### Phase 3: provisionTenant erweitern
- [ ] Task 5: Owner-Invite bei erfolgreicher Provisionierung erzeugen, Link im Platform-Admin-UI anzeigen

### Phase 4: Tenant-Kontext & Routen
- [ ] Task 6: `context.ts` (Tenant-Header → `tenantDb`-Client + aktueller User aus Session-Cookie)
- [ ] Task 7: `/accept-invite/[token]` (Seite + API)
- [ ] Task 8: `/login` (Seite + API) + Logout
- [ ] Task 9: `/members` (Liste + Einladen-Formular, nur owner/admin)

### Checkpoint: Abschluss
- [ ] Manuell: neuen Tenant anlegen → Invite-Link im Admin-UI → Einladung annehmen → einloggen → weiteres Mitglied einladen
- [ ] `npm test` und `npm run build` grün
- [ ] Review mit Mensch

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Tenant ohne Owner (letzte Owner-Rolle versehentlich entfernt) | Hoch | Explizite Prüfung vor jeder Rollenänderung: mindestens ein `owner` muss übrig bleiben |
| Abgelaufene/mehrfach genutzte Invite-Tokens | Mittel | `expiresAt` + `acceptedAt` serverseitig bei jedem Zugriff geprüft, nie nur clientseitig |
| Session-Cookie ohne Tenant-Bindung könnte versehentlich auf einer anderen Subdomain gültig erscheinen | Mittel | Cookie wird ohne `Domain`-Attribut gesetzt (Default: nur exakter Host), Session-Lookup zusätzlich gegen die aus dem Host aufgelöste Tenant-DB geprüft |

## Open Questions
- Keine blockierenden (Passwort-Reset siehe SPEC-identity-org.md Open Questions)
