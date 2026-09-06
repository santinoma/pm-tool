# Task List: tenant-provisioning

Siehe `tasks/plan-tenant-provisioning.md` und `SPEC-tenant-provisioning.md`.

## Phase 1: Projekt-Fundament

### Task 1: Next.js-Projekt initialisieren — ✅ erledigt
**Beschreibung:** TypeScript, App Router, minimale Startseite.
**Acceptance:** `npm run dev` startet fehlerfrei, `npm run build` erfolgreich.
**Verify:** `npm run build`
**Hinweis:** Next.js 16.3.2 wurde gescaffoldet — `middleware.ts` heißt jetzt `proxy.ts` (deprecated/renamed), betrifft Task 10. `type: module` + Vitest ergänzt für Task-Liste-Testing-Strategie.
**Dependencies:** None
**Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`
**Scope:** S

---

### Task 2: Docker Compose + Caddy — ✅ erledigt
**Beschreibung:** `docker-compose.yml` mit `postgres`-, `app`-, `caddy`-Service. `Caddyfile` mit Wildcard-Subdomain-Routing auf den App-Container.
**Acceptance:** `docker compose up` startet alle drei Container ohne Fehler; Postgres ist von `app` aus erreichbar.
**Verify:** Manuell verifiziert: `localhost`, `admin.localhost`, `kunde.localhost` liefern alle HTTP 200 über Caddy auf Port 80
**Hinweis:** `auto_https off` allein reicht nicht, damit Caddy Port 80 bindet — explizites `http://`-Schema in den Site-Adressen nötig, sonst bindet Caddy nur Port 443.
**Dependencies:** Task 1
**Files:** `docker-compose.yml`, `Caddyfile`, `.env.example`
**Scope:** S

---

### Task 3: Prisma-Doppelschema — ✅ erledigt
**Beschreibung:** `prisma/platform/schema.prisma` mit `Tenant`-Modell (id, name, subdomain, status, dbUrl, createdAt). `prisma/tenant/schema.prisma` ohne Modelle (Platzhalter, wird von `identity-org` etc. erweitert).
**Acceptance:** Beide Schemas lassen sich unabhängig migrieren.
**Verify:** Platform-Migration `init` erfolgreich angewendet und nach Container-Neustart persistent (Volume geprüft); Tenant-Schema hat noch keine Modelle, daher keine Migration nötig
**Hinweis (wichtig, Prisma 7 Breaking Change):** `datasource.url` in `schema.prisma` wird nicht mehr unterstützt. Verbindungs-URLs gehören jetzt in `prisma.config.ts` (hier: zwei getrennte Dateien `prisma.platform.config.ts`/`prisma.tenant.config.ts`, ausgewählt über `--config`). Für dynamische Laufzeit-Verbindungen (unser Multi-Tenant-Fall) wird stattdessen `@prisma/adapter-pg` mit `new PrismaClient({ adapter })` verwendet — das betrifft direkt `tenantDb.ts` (Task 9).
**Dependencies:** Task 2
**Files:** `prisma/platform/schema.prisma`, `prisma/tenant/schema.prisma`
**Scope:** S

---

## Checkpoint: Fundament — ✅ erreicht
- [x] `docker compose up` läuft fehlerfrei
- [x] `npm run build` grün

## Phase 2: Platform-DB & Tenant-Register

### Task 4: Platform-Prisma-Client — ✅ erledigt
**Beschreibung:** `src/platform/db.ts` — Singleton Prisma-Client für die Platform-DB (verhindert zu viele Verbindungen bei Next.js Hot-Reload).
**Acceptance:** Client kann in einem Testskript erfolgreich eine Query gegen die Platform-DB ausführen.
**Verify:** `tests/platformDb.test.ts` grün (echte Query gegen lokale DB)
**Hinweis:** Nutzt `@prisma/adapter-pg` — in Prisma 7 braucht `PrismaClient` immer einen Adapter, da `datasource.url` im Schema nicht mehr existiert.
**Dependencies:** Task 3
**Files:** `src/platform/db.ts`
**Scope:** XS

---

### Task 5: Tenant-Registry — ✅ erledigt
**Beschreibung:** `src/platform/tenantRegistry.ts` — `listTenants()`, `getTenantBySubdomain(subdomain)`, `createTenantRecord(data)`, `updateTenantStatus(id, status)`.
**Acceptance:** Alle vier Funktionen decken die Grundoperationen ab, typisiert über das Prisma-Tenant-Modell.
**Verify:** `tests/tenantRegistry.test.ts` grün (5 Tests, gegen echte lokale Platform-DB)
**Dependencies:** Task 4
**Files:** `src/platform/tenantRegistry.ts`, `tests/tenantRegistry.test.ts`
**Scope:** S

---

## Phase 3: Provisionierungs-Logik

### Task 6: Subdomain-Validierung — ✅ erledigt
**Beschreibung:** `src/platform/validateSubdomain.ts` — reine Funktion, prüft Zeichensatz (`[a-z0-9-]{3,63}`), keine führenden/folgenden Bindestriche, keine reservierten Wörter (`www`, `admin`, `api`).
**Acceptance:** Gültige Subdomains bestehen, ungültige (Großbuchstaben, Sonderzeichen, zu kurz, reserviert) werden abgelehnt mit spezifischem Fehlergrund.
**Verify:** `tests/validateSubdomain.test.ts` grün (7 Tests)
**Dependencies:** None
**Files:** `src/platform/validateSubdomain.ts`, `tests/validateSubdomain.test.ts`
**Scope:** XS

---

### Task 7: provisionTenant — ✅ erledigt
**Beschreibung:** `src/platform/provisionTenant.ts` — orchestriert: Subdomain validieren + Eindeutigkeit prüfen → `CREATE DATABASE` (sicherer, generierter Name, gequotet) → Tenant-Schema-Migration gegen neue DB ausführen (Node-Child-Process `prisma migrate deploy` mit `TENANT_DATABASE_URL`-Override) → Registereintrag mit Status "active" anlegen. Bei Fehler: Status "failed", angelegte DB löschen.
**Acceptance:** Erfolgreicher Durchlauf liefert `{tenantId, subdomain, status: "active"}`; Fehlerfälle (doppelte Subdomain, Migration schlägt fehl) hinterlassen keine verwaisten Datenbanken.
**Verify:** `tests/provisionTenant.test.ts` grün (3 Tests) — echter Integrationstest legt eine reale Postgres-Datenbank an, migriert sie und räumt sie danach wieder auf
**Dependencies:** Task 5, Task 6
**Files:** `src/platform/provisionTenant.ts`, `tests/provisionTenant.test.ts`
**Scope:** M

---

## Checkpoint: Provisionierung funktioniert — ✅ erreicht
- [x] Integrationstest grün (echte DB wird angelegt und migriert)
- [ ] Review mit Mensch vor Fortsetzung

## Phase 4: Tenant-Auflösung & Routing

### Task 8: resolveTenant — ✅ erledigt
**Beschreibung:** `src/tenant/resolveTenant.ts` — extrahiert Subdomain aus einem Hostnamen, ruft `getTenantBySubdomain` auf.
**Acceptance:** Korrekte Extraktion bei `kunde.dein-tool.de`, `localhost`-Sonderfall für lokale Entwicklung, `null` bei unbekannter Subdomain.
**Verify:** `tests/resolveTenant.test.ts` grün (6 Tests)
**Dependencies:** Task 5
**Files:** `src/tenant/resolveTenant.ts`, `tests/resolveTenant.test.ts`
**Scope:** S

---

### Task 9: tenantDb (Client-Cache) — ✅ erledigt
**Beschreibung:** `src/tenant/tenantDb.ts` — `getTenantDbClient(dbUrl)`, cached Prisma-Clients in einer Map, damit nicht pro Request neu verbunden wird.
**Acceptance:** Zweiter Aufruf mit derselben `dbUrl` liefert denselben Client (Referenzgleichheit).
**Verify:** `tests/tenantDb.test.ts` grün (2 Tests)
**Dependencies:** Task 3
**Files:** `src/tenant/tenantDb.ts`, `tests/tenantDb.test.ts`
**Scope:** XS

---

### Task 10: Proxy (vormals Middleware) — ✅ erledigt
**Beschreibung:** `src/proxy.ts` — unterscheidet Platform-Admin-Domain von Tenant-Subdomains, hängt aufgelösten Tenant-Kontext (Header `x-tenant-id`/`x-tenant-subdomain`) an den Request.
**Acceptance:** Anfragen an die Admin-Domain erreichen die Admin-Routen, Anfragen an eine bekannte Tenant-Subdomain bekommen den Tenant-Kontext, unbekannte Subdomain liefert 404.
**Verify:** Manuell verifiziert über `*.localhost` (automatische Auflösung, kein `/etc/hosts` nötig): unbekannte Subdomain → 404, `admin.localhost` → 200, echter Tenant `demo.localhost` → 200
**Dependencies:** Task 8
**Files:** `src/proxy.ts`
**Scope:** S
**Hinweis:** `middleware.ts` ist in Next.js 16 deprecated, heißt jetzt `proxy.ts` mit exportierter Funktion `proxy()` statt `middleware()`.

---

## Phase 5: Admin-UI

### Task 11: Tenant-Liste — ✅ erledigt
**Beschreibung:** `src/app/(platform-admin)/tenants/page.tsx` — Server Component, listet alle Tenants (Name, Subdomain, Status) via `listTenants()`.
**Acceptance:** Seite zeigt alle vorhandenen Tenants korrekt an.
**Verify:** Manuell via curl verifiziert (`admin.localhost/tenants` zeigt korrekt Name/Subdomain/Status)
**Hinweis:** Route musste explizit `export const dynamic = "force-dynamic"` bekommen — sonst hätte Next.js sie beim Build statisch vorgerendert (veralteter Stand in Produktion).
**Dependencies:** Task 5
**Files:** `src/app/(platform-admin)/tenants/page.tsx`
**Scope:** S

---

### Task 12: "Neuer Tenant"-Formular — ✅ erledigt
**Beschreibung:** Formular (Name, Subdomain) + API-Route, die `provisionTenant` aufruft und Erfolg/Fehler anzeigt.
**Acceptance:** Erfolgreiche Anlage erscheint sofort in der Liste; Fehler (doppelte Subdomain) wird verständlich angezeigt, ohne dass die Seite abstürzt.
**Verify:** End-to-end via curl verifiziert: Tenant "Demo Kunde"/`demo` angelegt (Status "active", echte DB `pmtool_tenant_demo` existiert), erscheint in der Liste, `demo.localhost` liefert 200, doppelte Subdomain liefert saubere Fehlermeldung statt Absturz
**Dependencies:** Task 7, Task 11
**Files:** `src/app/(platform-admin)/tenants/new/page.tsx`, `src/app/api/tenants/route.ts`
**Scope:** M

---

## Checkpoint: Abschluss — ✅ erreicht
- [x] Tenant angelegt, Subdomain lokal aufgerufen → Tenant korrekt aufgelöst
- [x] `npm test` (25 Tests) und `npm run build` grün
- [ ] Review mit Mensch vor Abschluss des Moduls
