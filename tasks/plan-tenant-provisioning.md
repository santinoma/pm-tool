# Implementation Plan: tenant-provisioning

## Overview
Erstes Modul des Projekts — legt gleichzeitig das gesamte Projekt-Fundament an (Next.js, Prisma mit zwei Schema-Welten, Docker Compose). Ziel: Platform-Admin kann über eine UI einen Tenant anlegen, der automatisch eine eigene, migrierte Postgres-Datenbank + Subdomain-Zugriff bekommt.

## Architecture Decisions
- **Zwei Prisma-Schemas** (`prisma/platform`, `prisma/tenant`) von Anfang an, auch wenn `prisma/tenant/schema.prisma` in diesem Modul nur ein Platzhalter-Modell enthält — spätere Module (`identity-org`, `projects-tasks`, ...) erweitern ausschließlich das Tenant-Schema
- **Sichere DB-Namen:** Subdomain wird validiert (`[a-z0-9-]{3,63}`), der tatsächliche Postgres-Datenbankname wird daraus programmatisch abgeleitet (Präfix + validierter Slug), nie direkte String-Interpolation von Nutzereingaben in SQL
- **Tenant-DB-Client-Cache:** ein In-Memory-Cache (Map) von Subdomain → Prisma-Client, damit nicht pro Request neu verbunden wird — Grundlage für alle folgenden Module

## Task List

### Phase 1: Projekt-Fundament
- [ ] Task 1: Next.js-Projekt (TypeScript, App Router) initialisieren
- [ ] Task 2: Docker Compose (postgres, app, caddy) + Caddyfile für Wildcard-Subdomains
- [ ] Task 3: Prisma-Doppelschema anlegen (platform + tenant, jeweils minimal)

### Checkpoint: Fundament
- [ ] `docker compose up` startet alle drei Container fehlerfrei
- [ ] `npm run build` grün

### Phase 2: Platform-DB & Tenant-Register
- [ ] Task 4: Platform-Prisma-Client (`db.ts`) + `Tenant`-Modell-Migration
- [ ] Task 5: `tenantRegistry.ts` (CRUD-Funktionen)

### Phase 3: Provisionierungs-Logik
- [ ] Task 6: Subdomain-Validierung (reine Funktion, unit-getestet)
- [ ] Task 7: `provisionTenant.ts` (DB anlegen, migrieren, Registereintrag, Fehlerpfad mit Aufräumen)

### Checkpoint: Provisionierung funktioniert
- [ ] Integrationstest: `provisionTenant` erzeugt echte, migrierte DB gegen lokale Docker-Postgres
- [ ] Review mit Mensch

### Phase 4: Tenant-Auflösung & Routing
- [ ] Task 8: `resolveTenant.ts` (Subdomain → Tenant-Lookup)
- [ ] Task 9: `tenantDb.ts` (Client-Cache pro Tenant)
- [ ] Task 10: `middleware.ts` (Platform-Admin-Domain vs. Tenant-Subdomains)

### Phase 5: Admin-UI
- [ ] Task 11: Tenant-Liste (Admin-Seite)
- [ ] Task 12: "Neuer Tenant"-Formular + API-Route

### Checkpoint: Abschluss
- [ ] Manuell: Tenant über UI anlegen, Subdomain lokal aufrufen, Tenant wird korrekt aufgelöst
- [ ] `npm test` und `npm run build` grün
- [ ] Review mit Mensch

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| SQL-Injection über dynamische DB-Namen bei `CREATE DATABASE` | Hoch | Strikte Validierung + Whitelist-Zeichensatz vor jeder SQL-Verwendung, nie rohe Nutzereingabe interpolieren |
| Halb angelegte Tenants bei Fehlern mitten in der Provisionierung (DB da, Migration fehlgeschlagen) | Mittel | Expliziter Fehlerpfad: Status "failed" setzen, DB-Reste löschen, kein "active"-Status ohne vollständige Migration |
| Lokales Subdomain-Testing ohne echte DNS-Kontrolle | Niedrig | `/etc/hosts`-Einträge für lokale Test-Subdomains, dokumentiert in README |

## Open Questions
- Keine blockierenden (siehe "Open Questions" in SPEC-tenant-provisioning.md für den ersten Admin-Account, wird in `identity-org` gelöst)
