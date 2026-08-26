# Implementation Plan: sso-scim (2FA + SCIM)

## Overview
Zwei weitgehend unabhängige Teile im selben Modul: TOTP-2FA (Secret pro
User, Pending-Login-Token für den Zwei-Schritt-Login, zentrale
Erzwingungs-Umleitung in `proxy.ts`) und ein SCIM-2.0-Server
(Bearer-Token-authentifizierte REST-Routen unter `/scim/v2/Users`).

## Architecture Decisions
- TOTP: RFC 6238 (HMAC-SHA1, 30s-Schritt, 6 Ziffern) manuell mit
  `node:crypto` implementiert — kein neues npm-Package für eine so kleine,
  gut spezifizierte Berechnung.
- Pending-Login-Token: kurzlebig (5 Minuten), signiert/zufällig, in der DB
  gespeichert (`PendingLogin`-Modell mit `userId`, `expiresAt`) statt JWT —
  konsistent mit dem bestehenden Session-Modell-Muster (DB-Zeile statt
  signiertem Token).
- `require2fa`-Durchsetzung läuft zentral in `proxy.ts`, exakt nach dem in
  `client-portal` etablierten Muster (Session laden, Redirect wenn Kriterium
  nicht erfüllt, Allowlist für Auth-/Settings-Pfade) — keine neue
  Durchsetzungs-Infrastruktur nötig.
- SCIM-Routen liegen außerhalb von `/api/tenant/...` (eigener `/scim/v2/...`-
  Pfad), da sie ein anderes Auth-Modell (Bearer-Token statt Session-Cookie)
  haben und von einem externen System (IdP), nicht dem Frontend, aufgerufen
  werden.
- SCIM-Token wird als Klartext in `TenantSettings.scimBearerToken`
  gespeichert (analog zu Invite-Tokens) — einfache Rotation durch
  Neu-Generieren.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `User.totpSecret`/`totpEnabled`, `TenantSettings.require2fa`/`scimBearerToken`, `PendingLogin`-Modell, Migration

### Checkpoint: Schema
- [ ] Migration, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `computeTotpCode()`/`verifyTotpCode()` gegen RFC-6238-Testvektoren + Tests
- [ ] Task 3: Pending-Login-Token-Gültigkeitsprüfung + Tests

### Phase 3: 2FA-API
- [ ] Task 4: `POST /api/tenant/2fa/enroll`, `POST /api/tenant/2fa/verify`
- [ ] Task 5: `POST /api/tenant/login` erweitert (Pending-Token bei aktivem 2FA), `POST /api/tenant/login/2fa` + Integrationstest
- [ ] Task 6: `proxy.ts` `require2fa`-Durchsetzung

### Checkpoint: 2FA
- [ ] Tests grün, Docker: falscher Code abgelehnt, Umleitung bei fehlendem 2FA

### Phase 4: SCIM-API
- [ ] Task 7: `GET`/`POST /scim/v2/Users`, `PATCH`/`PUT /scim/v2/Users/[id]` (Bearer-Auth) + Integrationstest
- [ ] Task 8: SCIM-Token-Verwaltung (`POST /api/tenant/organization/scim-token`, nur owner/admin)

### Checkpoint: SCIM
- [ ] Tests grün, Docker: 401 ohne/mit falschem Token, User-Provisionierung end-to-end

### Phase 5: UI
- [ ] Task 9: 2FA-Einrichtung in Settings → Security
- [ ] Task 10: "2FA erzwingen"-Schalter + SCIM-Token-Anzeige in Settings → Organization

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Zeitversatz zwischen Client-Authenticator und Server bei TOTP | Mittel | ±1 Zeitfenster (30s) Toleranz bei der Verifikation, wie bei allen TOTP-Implementierungen üblich |
| require2fa sperrt Owner ohne 2FA versehentlich aus | Hoch | Umleitung geht auf /settings/security, nicht auf eine Sackgasse — Einrichtung bleibt erreichbar |

## Open Questions
Keine.
