# Task List: sso-scim (2FA + SCIM)

Siehe `tasks/plan-sso-scim.md` und `SPEC-sso-scim.md`. **SSO (OIDC) bewusst
nicht Teil dieses Moduls** — braucht einen echten externen IdP zum Testen.

## Phase 1: Datenmodell — ✅ erledigt
- [x] Task 1: Schema-Erweiterungen + `PendingLogin`, Migration

## Phase 2: Reine Logik — ✅ erledigt
- [x] Task 2: TOTP-Berechnung/Verifikation + Tests (9 Tests grün, gegen RFC-6238-Testvektoren geprüft)
- [x] Task 3: Pending-Login-Gültigkeit + Tests (3 Tests grün)

## Phase 3: 2FA-API — ✅ erledigt, via Docker verifiziert
- [x] Task 4: Enroll/Verify-Routen
- [x] Task 5: Login-Flow erweitert + Integrationstest (`tests/twoFactorLogin.test.ts`, 3 Tests grün)
- [x] Task 6: `proxy.ts` require2fa-Durchsetzung + Test (`tests/proxy2faAllowlist.test.ts`, 3 Tests grün)

## Phase 4: SCIM-API — ✅ erledigt, via Docker verifiziert
- [x] Task 7: `/scim/v2/Users` GET/POST/PATCH/PUT + Integrationstest (`tests/scim.test.ts`, 2 Tests grün)
- [x] Task 8: SCIM-Token-Verwaltung

## Phase 5: UI — ✅ erledigt, via Docker verifiziert
- [x] Task 9: 2FA-Einrichtung (Settings → Security) + Login-Seite um 2FA-Schritt erweitert
- [x] Task 10: 2FA erzwingen + SCIM-Token (Settings → Organization)

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria verifiziert (voller 2FA-Login-Roundtrip inkl. falschem Code, require2fa-Umleitung auf /settings/security bei fehlendem Setup, SCIM-Provisionierung/Suche/Deaktivierung rein über Bearer-Token ohne Session-Cookie, 401 ohne/mit falschem Token, 409 bei Duplikat)
- [x] `npm test` (336 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls

## Hinweis
Ein Postgres-Absturz+Auto-Recovery trat während der Testläufe auf (Docker/
Host-bedingt, nicht durch Code-Änderungen verursacht) — nach Recovery liefen
alle 336 Tests grün.
