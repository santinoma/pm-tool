# Spec: tenant-provisioning

Modul aus `CAPABILITY-MAP.md`. Fundament-Modul, keine Abhängigkeiten. Alle nachfolgenden Module bauen darauf auf.

## Objective
Eine Control-Plane, mit der der Platform-Betreiber (du) neue Kunden ("Tenants") anlegt. Jeder Tenant bekommt automatisch eine eigene Postgres-Datenbank + eine eigene Subdomain. Die eigentliche PM-Anwendung (alle folgenden Module) läuft als eine gemeinsame Next.js-Instanz, die pro Request anhand der Subdomain den richtigen Tenant und dessen Datenbank auflöst.

**Nutzer dieses Moduls:** ausschließlich Platform-Admins (du). Kein Self-Service-Signup in v1.

**Erfolg:** Du kannst über eine Admin-Oberfläche einen Tenant-Namen + Subdomain eingeben, klickst "Anlegen", und Minuten später ist `kunde.dein-tool.de` erreichbar mit einer leeren, migrierten Datenbank und einem ersten Admin-Account für den Kunden.

## Tech Stack
- Next.js (App Router) + TypeScript
- PostgreSQL — zwei Kategorien von Datenbanken:
  - **Platform-DB** (1x, fest): Tenant-Register
  - **Tenant-DBs** (1x pro Tenant, dynamisch erzeugt): fachliche Daten aller anderen Module
- Prisma — zwei Schemas: `prisma/platform/schema.prisma` (Platform-DB) und `prisma/tenant/schema.prisma` (Tenant-DB-Vorlage, wird bei Provisionierung auf die neue DB migriert)
- Docker Compose lokal: `postgres`-Container (ein Server, mehrere Datenbanken drauf), `app`-Container (Next.js), `proxy`-Container (Caddy — automatisches Subdomain-Routing + TLS)

## Commands
```
Dev (gesamter Stack):     docker compose up
Build:                     npm run build
Test:                      npm test
Platform-DB migrieren:     npx prisma migrate deploy --schema=prisma/platform/schema.prisma
Tenant-DB migrieren:       npx prisma migrate deploy --schema=prisma/tenant/schema.prisma (wird programmatisch pro Tenant-DB-URL aufgerufen, siehe provisionTenant)
```

## Project Structure
```
prisma/
  platform/schema.prisma   → Tenant-Register-Modell (Platform-DB)
  tenant/schema.prisma      → Basis-Schema für jede Tenant-DB (wird von diesem und folgenden Modulen erweitert)
src/
  platform/
    db.ts                   → Prisma-Client für die Platform-DB (Singleton)
    provisionTenant.ts       → Kernlogik: DB anlegen, Migration ausführen, Tenant-Registereintrag erzeugen
    tenantRegistry.ts         → CRUD auf dem Tenant-Register (listTenants, getTenantBySubdomain, ...)
  tenant/
    resolveTenant.ts          → liest Subdomain aus dem Request, schlägt Tenant im Register nach
    tenantDb.ts                → erzeugt/cached einen Prisma-Client pro Tenant-DB-Connection-String
  app/
    (platform-admin)/
      tenants/page.tsx         → Admin-UI: Tenant-Liste + "Neuen Tenant anlegen"-Formular
    (tenant)/
      layout.tsx                → liest Tenant aus der Subdomain (Middleware), stellt Tenant-DB-Client bereit
middleware.ts                 → erkennt Subdomain, leitet Platform-Admin-Domain vs. Tenant-Domains unterschiedlich
docker-compose.yml
Caddyfile                      → Wildcard-Subdomain-Routing auf den app-Container
tests/
  provisionTenant.test.ts
  resolveTenant.test.ts
```

## Code Style
```typescript
// src/platform/provisionTenant.ts
export interface ProvisionTenantInput {
  name: string;
  subdomain: string; // z.B. "kunde" → kunde.dein-tool.de
}

export interface ProvisionTenantResult {
  tenantId: string;
  subdomain: string;
  status: "provisioning" | "active" | "failed";
}

export async function provisionTenant(
  input: ProvisionTenantInput,
): Promise<ProvisionTenantResult> {
  // 1. Subdomain-Eindeutigkeit prüfen (Platform-DB)
  // 2. Neue Postgres-Datenbank anlegen (CREATE DATABASE, sicher gequotet)
  // 3. Tenant-Schema-Migration gegen die neue DB ausführen
  // 4. Tenant-Registereintrag mit status "active" anlegen
  // Bei Fehlern in Schritt 2/3: status "failed", DB-Reste aufräumen
}
```

- Naming: `camelCase` für Funktionen, Tenant-Subdomains ausschließlich lowercase/kebab-ähnlich (`[a-z0-9-]+`), validiert vor jeder Nutzung
- Jede Funktion, die eine Tenant-DB anspricht, bekommt die Connection-Info explizit übergeben (nie global gemutet) — Grundlage für spätere Tests mit mehreren Tenants parallel

## Testing Strategy
- **Framework:** Vitest
- **Unit-Tests:** Subdomain-Validierung, Tenant-Registry-Lookups (gegen eine Test-Platform-DB oder gemockt), Fehlerpfade von `provisionTenant` (doppelte Subdomain, ungültiger Name)
- **Integrationstest (mit echter lokaler Postgres-Instanz via Docker):** ein voller `provisionTenant`-Durchlauf erzeugt tatsächlich eine neue, migrierte Datenbank
- Manuelle Verifikation: Tenant über die Admin-UI anlegen, Subdomain im Browser aufrufen

## Boundaries
- **Always:** Subdomains vor DB-Namen-Verwendung strikt validieren (SQL-Injection über `CREATE DATABASE "..."` ist ein reales Risiko bei dynamischen Namen) — nur validierte, generierte interne DB-Namen verwenden, niemals die Nutzereingabe direkt interpolieren
- **Ask first:** Löschen/Deprovisionieren eines Tenants (Datenverlust) — in v1 nicht automatisiert, nur manuell mit Rückfrage
- **Never:** Tenant-Datenbanken über eine gemeinsame Connection/Client-Instanz mit anderen Tenants teilen — jede Anfrage bekommt ihren eigenen aufgelösten Tenant-Client

## Success Criteria
- [ ] Admin-UI zeigt eine Liste aller Tenants (Name, Subdomain, Status)
- [ ] Formular "Neuer Tenant" erzeugt: neue Postgres-DB, migriertes Schema, Registereintrag mit Status "active"
- [ ] Aufruf von `kunde.dein-tool.de` (lokal via `/etc/hosts` oder Wildcard-DNS) routet auf die App und löst korrekt den Tenant "kunde" auf
- [ ] Doppelte Subdomain wird abgelehnt mit klarer Fehlermeldung, keine halb angelegte DB bleibt zurück
- [ ] `npm run build` und `npm test` grün

## Open Questions
- Erster Admin-Account pro Tenant: wird er im Zuge der Provisionierung automatisch erzeugt (mit temporärem Passwort/Einladungslink), oder legt der Kunde ihn selbst beim ersten Login an? → Wird in `identity-org` entschieden, da dort Auth entsteht; dieses Modul liefert nur den Hook dafür
- Konkreter Hosting-Anbieter für Produktion noch offen (siehe Architektur-Empfehlung in `CAPABILITY-MAP.md`) — blockiert v1-Entwicklung nicht, da lokal via Docker Compose gearbeitet wird
