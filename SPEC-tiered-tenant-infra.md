# Spec: tiered-tenant-infra (v2 Modul 12)

## Objective
Enterprise-Tenants können bei der Anlage auf eine dedizierte
Postgres-Verbindung (statt dem geteilten Standard-Server) provisioniert
werden. **Grenze:** In dieser Umgebung existiert nur ein Postgres-
Container — es wird die Mechanik verifiziert (Tenant landet auf der
angegebenen Ziel-Connection-String), nicht echte physische
Infrastruktur-Trennung.

## Tech Stack
Next.js App Router, TypeScript, Prisma (Platform-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
prisma/platform/schema.prisma                → Tenant.tier
src/platform/provisionTenant.ts              → optionaler targetConnectionString-Parameter
src/app/api/tenants/route.ts                 → POST erweitert um tier/targetConnectionString
src/app/(platform-admin)/tenants/new/        → UI-Erweiterung: Tier-Auswahl
src/app/(platform-admin)/tenants/page.tsx    → Tier-Anzeige in der Liste
tests/                                        → Integrationstest
```

## Code Style
Bestehende Muster: `provisionTenant()`-Fehlerbehandlung (Rollback bei
Fehlschlag) unverändert, Field-Atlas-CSS.

## Testing Strategy
Integrationstest: `provisionTenant()` mit `targetConnectionString` legt die
Tenant-DB nachweislich über diese Connection an (nicht über
`PLATFORM_DATABASE_URL`) und speichert `tier: "dedicated"`. Docker-E2E:
Tenant mit explizitem `targetConnectionString` (auf denselben, einzigen
Postgres-Container zeigend, aber als eigene benannte Verbindung) anlegen,
Tier in der Liste sichtbar.

## Boundaries
- Always: Ohne `targetConnectionString` bleibt das Verhalten identisch zu
  vorher (Standard-Server, `tier: "shared"`).
- Ask first: Migration eines bestehenden Tenants von shared zu dedicated
  — bewusst außerhalb des v1-Scopes.
- Never: Echte physische Mehr-Server-Verifikation behaupten, die diese
  Umgebung nicht leisten kann — als Grenze dokumentiert, nicht verschwiegen.

## Success Criteria
- `provisionTenant()` akzeptiert `targetConnectionString`; wenn gesetzt,
  wird die Tenant-Datenbank über diese Verbindung angelegt.
- `Tenant.tier` wird korrekt gespeichert (`shared` per Default, `dedicated`
  wenn eine Ziel-Connection-String angegeben wurde).
- `/tenants/new` erlaubt die Auswahl; `/tenants` zeigt den Tier pro Zeile.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert (Mechanik,
  keine echte Multi-Server-Trennung).

## Open Questions
Keine — Annahmen wurden bestätigt, inkl. der Testbarkeits-Grenze.
