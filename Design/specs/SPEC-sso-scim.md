# Spec: sso-scim (v2 Modul 10, Scope: 2FA + SCIM)

## Objective
Enterprise-Auth-Grundlagen ohne externen Identity Provider: TOTP-basierte
Zwei-Faktor-Authentifizierung (optional pro User, erzwingbar pro Tenant)
sowie ein SCIM-2.0-kompatibler Server unter `/scim/v2/Users`, über den ein
externer IdP Nutzer provisionieren/deprovisionieren kann. **SSO (OIDC)
explizit ausgeklammert** — braucht einen echten externen IdP zum Testen,
den es in dieser Umgebung nicht gibt.

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB). TOTP selbst
implementiert (RFC 6238, HMAC-SHA1) — kein externes Paket.

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
prisma/tenant/schema.prisma                  → User.totpSecret/totpEnabled, TenantSettings.require2fa/scimBearerToken
src/tenant/auth/totp.ts                      → reine TOTP-Logik (Secret, Code berechnen/prüfen)
src/tenant/auth/pendingLogin.ts              → reine Logik für den 2FA-Zwischenschritt-Token
src/app/api/tenant/2fa/enroll/route.ts       → POST (Secret generieren)
src/app/api/tenant/2fa/verify/route.ts       → POST (Code bestätigen, totpEnabled=true)
src/app/api/tenant/login/route.ts            → erweitert: bei totpEnabled kein Session sofort, sondern Pending-Token
src/app/api/tenant/login/2fa/route.ts        → POST (Pending-Token + Code → Session)
src/proxy.ts                                 → erweitert: require2fa-Durchsetzung analog zur Client-Portal-Umleitung
src/app/scim/v2/Users/route.ts               → GET/POST
src/app/scim/v2/Users/[id]/route.ts          → PATCH/PUT
src/app/api/tenant/organization/scim-token/route.ts → POST (Token neu generieren, nur owner/admin)
src/app/(tenant)/settings/security/          → UI: 2FA aktivieren
src/app/(tenant)/settings/organization/      → UI: 2FA erzwingen + SCIM-Token anzeigen
tests/                                        → Unit + Integrationstest
```

## Code Style
Bestehende Muster: reine Funktionen für TOTP/Token-Logik, `canManageMembers`-
Guard für Tenant-weite Einstellungen, proxy.ts-Redirect-Muster aus
`client-portal` wiederverwendet.

## Testing Strategy
Vitest: TOTP-Code-Berechnung gegen bekannte RFC-6238-Testvektoren,
Zeitfenster-Toleranz, Pending-Token-Ablauf. Integrationstest: 2FA-Enrollment
→ Login verlangt Code → falscher Code abgelehnt → richtiger Code erstellt
Session. SCIM: User per POST anlegen, per GET mit Filter finden, per
PATCH deaktivieren — via curl mit Bearer-Token, ohne Session-Cookie.
Docker-E2E: `require2fa` blockiert nicht-eingerichtete User zentral über
`proxy.ts`, SCIM-Endpunkte ohne/mit falschem Token liefern 401.

## Boundaries
- Always: SCIM-Endpunkte authentifizieren ausschließlich über den
  Bearer-Token, nie über Session-Cookies.
- Ask first: SSO/OIDC, SCIM-Gruppen-Endpunkte (`/scim/v2/Groups`) — bewusst
  außerhalb des Scopes dieses Moduls.
- Never: TOTP-Secrets im Klartext in Logs oder API-Antworten außerhalb des
  einmaligen Enrollment-Schritts zurückgeben.

## Success Criteria
- Ein User kann 2FA in Settings → Security aktivieren (Secret/otpauth-URI,
  Bestätigung per Code).
- Login eines 2FA-Users ohne korrekten Code schlägt fehl; mit korrektem
  Code entsteht eine Session.
- Bei aktivierter `require2fa`-Einstellung werden User ohne eingerichtetes
  2FA zentral zur Einrichtung umgeleitet (analog Client-Portal-Muster).
- Ein externer Client kann per Bearer-Token SCIM-Nutzer anlegen, per Filter
  finden und deaktivieren; falscher/fehlender Token liefert 401.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt. SSO ist bewusst nicht Teil dieses
Moduls.
