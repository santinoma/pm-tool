# Task List: identity-org

Siehe `tasks/plan-identity-org.md` und `SPEC-identity-org.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `User`, `Session`, `Invite`, `Team`, `TeamMember`-Modelle + `Role`-Enum gemäß Spec ins Tenant-Schema.
**Acceptance:** Migration lässt sich gegen die lokale Dev-Tenant-DB anwenden.
**Verify:** `npm run db:tenant:migrate` gegen `pmtool_tenant_dev`
**Files:** `prisma/tenant/schema.prisma`
**Scope:** S

---

## Phase 2: Auth-Grundlagen

### Task 2: password.ts — ✅ erledigt
**Beschreibung:** `hashPassword(plain)`, `verifyPassword(plain, hash)` via bcryptjs.
**Acceptance:** Hash ist nie identisch mit dem Klartext, `verifyPassword` erkennt korrekte/falsche Passwörter korrekt.
**Verify:** `tests/password.test.ts`
**Files:** `src/tenant/auth/password.ts`, `tests/password.test.ts`
**Scope:** XS

---

### Task 3: invite.ts — ✅ erledigt
**Beschreibung:** `generateInviteToken()` (kryptographisch zufällig), `isInviteValid(invite)` (nicht abgelaufen, nicht angenommen) als reine Funktionen.
**Acceptance:** Token sind ausreichend lang/zufällig (kein Kollisionsrisiko in Tests erkennbar), `isInviteValid` lehnt abgelaufene und bereits angenommene Invites ab.
**Verify:** `tests/invite.test.ts`
**Files:** `src/tenant/auth/invite.ts`, `tests/invite.test.ts`
**Scope:** S

---

### Task 4: session.ts — ✅ erledigt
**Beschreibung:** `buildSessionCookie(sessionId, expiresAt)` (reine Funktion, liefert Cookie-Optionen), `isSessionExpired(session)`.
**Acceptance:** Cookie-Optionen enthalten `httpOnly: true`, `sameSite: "lax"`; abgelaufene Sessions werden korrekt erkannt.
**Verify:** `tests/session.test.ts`
**Files:** `src/tenant/auth/session.ts`, `tests/session.test.ts`
**Scope:** XS

---

## Checkpoint: Auth-Grundlagen — ✅ erreicht
- [x] Alle Unit-Tests aus Task 2-4 grün (41 Tests gesamt)
- [x] `npm run build` grün

## Phase 3: provisionTenant erweitern

### Task 5: Owner-Invite bei Provisionierung — ✅ erledigt
**Beschreibung:** Nach erfolgreicher Tenant-Migration in `provisionTenant.ts`: Owner-`Invite` in der neuen Tenant-DB anlegen, Invite-Link als Teil des Rückgabewerts liefern. Das "Neuer Tenant"-Formular zeigt den Link direkt nach erfolgreicher Anlage an (statt sofort zur Liste weiterzuleiten).
**Acceptance:** Nach Provisionierung ist ein Invite-Link sichtbar, der tatsächlich auf `/accept-invite/{token}` der neuen Subdomain zeigt.
**Verify:** `tests/provisionTenant.test.ts` grün — Integrationstest bestätigt genau einen `Invite` mit Rolle `owner` in der neuen Tenant-DB
**Files:** `src/platform/provisionTenant.ts`, `src/app/(platform-admin)/tenants/new/page.tsx`, `src/app/api/tenants/route.ts`, `tests/provisionTenant.test.ts`
**Scope:** M
**Hinweis:** Formular um Pflichtfeld "Owner-E-Mail" erweitert (nötig, um den `Invite`-Datensatz zu befüllen). Die Tenant-**Liste** zeigt den Link nicht dauerhaft an (würde eine Live-Abfrage in jede Tenant-DB erfordern) — der Link ist nur direkt nach Anlage im Formular sichtbar, wie im Erfolgskriterium gefordert.

---

## Phase 4: Tenant-Kontext & Routen

### Task 6: context.ts — ✅ erledigt
**Beschreibung:** Liest `x-tenant-id`/`x-tenant-subdomain` (aus `proxy.ts` gesetzt) via `next/headers`, liefert `{ tenantDb, currentUser }` für Server Components/Route-Handler.
**Acceptance:** Ohne gültige Session liefert `currentUser` `null`; mit gültigem Session-Cookie den passenden `User`.
**Verify:** `tests/context.test.ts` (gegen echte lokale Tenant-Test-DB)
**Files:** `src/tenant/context.ts`, `tests/context.test.ts`
**Scope:** M

---

### Task 7: Einladung annehmen — ✅ erledigt, end-to-end via Docker verifiziert
**Beschreibung:** `/accept-invite/[token]/page.tsx` (Formular: Name, Passwort) + `POST /api/tenant/invites/[token]/accept`. Legt/aktualisiert `User`, setzt `acceptedAt`, erstellt Session-Cookie, leitet auf `/members` weiter.
**Acceptance:** Gültige Einladung führt zu eingeloggtem Zustand; abgelaufene/bereits angenommene Einladung zeigt klaren Fehler statt Absturz.
**Verify:** Manuell + Integrationstest für die Fehlerfälle
**Files:** `src/app/(tenant)/accept-invite/[token]/page.tsx`, `src/app/api/tenant/invites/[token]/accept/route.ts`
**Scope:** M

---

### Task 8: Login/Logout — ✅ erledigt, end-to-end via Docker verifiziert (inkl. serverseitiger Session-Löschung bei Logout)
**Beschreibung:** `/login/page.tsx` (E-Mail/Passwort) + `POST /api/tenant/login`, `POST /api/tenant/logout`.
**Acceptance:** Korrekte Zugangsdaten setzen ein Session-Cookie und leiten weiter; falsche Zugangsdaten zeigen eine generische Fehlermeldung (kein Hinweis, ob E-Mail existiert); Logout löscht die Session serverseitig und das Cookie.
**Verify:** Manuell im Browser
**Files:** `src/app/(tenant)/login/page.tsx`, `src/app/api/tenant/login/route.ts`, `src/app/api/tenant/logout/route.ts`
**Scope:** M

---

### Task 9: Mitgliederverwaltung — ✅ erledigt, end-to-end via Docker verifiziert
**Beschreibung:** `/members/page.tsx` — Liste aller `User` + Formular "Einladen" (E-Mail, Rolle), nur sichtbar/nutzbar für `owner`/`admin`. `POST /api/tenant/invites`.
**Acceptance:** Neue Einladung erscheint mit Link in der Liste; Rollenwechsel verhindert, dass der letzte `owner` degradiert wird.
**Verify:** Manuell im Browser
**Files:** `src/app/(tenant)/members/page.tsx`, `src/app/api/tenant/invites/route.ts`
**Scope:** M

---

## Checkpoint: Abschluss — ✅ erreicht
- [x] Manuell/E2E via Docker: Tenant anlegen → Invite-Link → annehmen → einloggen → Mitglied einladen → Owner-Schutzlogik greift → Logout löscht Session serverseitig → `/members` ohne Session leitet auf `/login` um
- [x] `npm test` (54 Tests) und `npm run build` grün
- [ ] Review mit Mensch vor Abschluss des Moduls
- [ ] Review mit Mensch vor Abschluss des Moduls
