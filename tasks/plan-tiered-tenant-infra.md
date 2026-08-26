# Implementation Plan: tiered-tenant-infra

## Overview
`Tenant.tier` (Enum `shared`/`dedicated`) auf der Platform-DB.
`provisionTenant()` bekommt einen optionalen vierten Parameter
`targetConnectionString` — wenn gesetzt, wird die `CREATE DATABASE`-
Anweisung und die anschließende Migration gegen diese Verbindung
ausgeführt statt gegen `PLATFORM_DATABASE_URL`.

## Architecture Decisions
- Kein neues "Infra-Pool"-Verwaltungsmodell (benannte Server-Presets) in
  v1 — der Admin gibt die Ziel-Connection-String direkt beim Anlegen ein,
  analog zu einem Environment-Variable-artigen Wert. Presets wären ein
  sinnvoller Ausbau, aber v1-Scope ist die Mechanik.
  Since Datenbank-URL bereits pro Tenant in `dbUrl` gespeichert wird,
  ist die Architektur dafür schon vorbereitet — dieses Modul macht die
  Wahl beim Anlegen nur explizit statt implizit.
- `tier` wird rein aus der An-/Abwesenheit von `targetConnectionString`
  beim Provisionieren abgeleitet, nicht separat vom Admin gesetzt — kann
  nicht auseinanderlaufen.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `Tenant.tier`, Migration (Platform-DB)

### Checkpoint: Schema
- [ ] Migration, `npm run build` grün

### Phase 2: Provisionierung
- [ ] Task 2: `provisionTenant()` erweitert um `targetConnectionString` + Integrationstest

### Phase 3: API + UI
- [ ] Task 3: `POST /api/tenants` erweitert
- [ ] Task 4: `/tenants/new` Tier-Auswahl + Ziel-Connection-String-Feld
- [ ] Task 5: `/tenants`-Liste zeigt Tier

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E (Mechanik), Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Admin gibt eine unerreichbare Connection-String ein | Mittel | Bestehende Rollback-Logik in `provisionTenant()` (DB droppen, Tenant-Status "failed") greift unverändert |

## Open Questions
Keine.
