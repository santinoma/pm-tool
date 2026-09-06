# Task List: Produktiv-Parität Domäne 6 (SSO)

Quelle: `tasks/plan-productive-parity-roadmap.md`, Domäne 6.

## SAML-2.0-SSO + Erzwingung — ✅ erledigt
- [x] `samlify`-Paket installiert (echte, geprüfte XML-Signaturvalidierung —
  KEINE selbstgebaute Krypto, `checkSignature: true` bestätigt als
  Default, nirgends überschrieben — explizit im Agent-Report verifiziert)
- [x] `SsoConfig`-Modell (eine Zeile pro Tenant-DB — die DB-Grenze IST
  bereits die Org-Grenze in dieser Architektur)
- [x] `GET/PUT /api/tenant/sso-config` (owner/admin, Cert-Format-Validierung
  vor dem Speichern), `PATCH .../enforce`
- [x] `GET /api/tenant/sso/login` (Redirect zum IdP mit signiertem
  AuthnRequest), `POST /api/tenant/sso/acs` (validiert SAML-Response-
  Signatur, matched per E-Mail gegen bestehende User — KEINE
  Auto-Provisionierung, das bleibt SCIMs Aufgabe), `GET .../metadata`
- [x] Client-Rolle explizit von SSO ausgeschlossen (`isEligibleForSso()`),
  ebenso von der Erzwingung ausgenommen (`isPasswordLoginAllowed()`) —
  beide als reine, unabhängig testbare Funktionen extrahiert
- [x] UI: `settings/organization/sso`, "Mit SSO anmelden"-Link auf der
  Login-Seite (nur sichtbar wenn `enabled`)
- [x] Test: `ssoConfig.test.ts` (15 Tests)

## Bewusst nicht gebaut
- Multi-Org-Login-Disambiguierung (mehrere SSO-Orgs pro E-Mail) — kleines
  Feature, für später vorgemerkt
- Zertifikats-Rotation-Admin-UI — operatives Detail, nicht blockierend

## Docker-E2E-Verifikation (2026-08-27)
- **Wichtiger Fund**: `docker-compose.yml` nutzt ein anonymes
  `node_modules`-Volume, das beim Rebuild NICHT automatisch aktualisiert
  wird — nach `npm install samlify` schlug der Container mit
  "Module not found: Can't resolve 'samlify'" fehl, obwohl der Build
  selbst sauber lief. Behoben durch `docker compose down` (ohne `-v`,
  Postgres-/Uploads-Daten blieben erhalten) + `up -d`, wodurch das
  veraltete anonyme Volume neu erstellt wurde.
- Cert-Format-Validierung: ungültiges Cert → 400, gültiges PEM-Format → 200
- Erzwingung korrekt blockiert (400), solange SSO nicht `enabled` ist
- Login-Seite und SSO-Settings-Seite rendern korrekt

## Checkpoint: Abschluss
- [x] Tests+Build grün (im Rahmen der Domäne-3-Sammelverifikation:
  630/630), Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls — **besonders wichtig
  bei SSO**: echte Verifikation mit einem echten IdP (Okta/Entra/Google)
  steht noch aus, nur die Signaturvalidierungs-Logik und das
  Konfigurations-/Erzwingungs-Verhalten wurden verifiziert
