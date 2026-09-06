# Implementation Plan: integrations-marketplace

## Overview
`ApiKey` (userId, name, tokenHash, tokenPrefix, revokedAt) für die
öffentliche API. Marktplatz-Vorlagen sind eine statische, im Code
gepflegte Liste (kein neues Tabellen-Modell nötig) — "Installieren" ruft
einfach die bestehende Webhook-Erstellung mit den Vorlagen-Werten auf und
markiert den entstandenen `WebhookEndpoint` mit `integrationTemplateKey`.

## Architecture Decisions
- Token-Format: `pmtool_<32 zufällige Hex-Zeichen>`, gehasht mit SHA-256
  gespeichert (kein bcrypt nötig — API-Keys sind selbst schon
  hochentropisch, anders als Passwörter, ein schneller Hash reicht und
  macht Bearer-Auth-Lookups günstig).
- `tokenPrefix` (erste 12 Zeichen) wird zusätzlich im Klartext gespeichert,
  damit die Liste bestehender Keys sie identifizierbar anzeigen kann, ohne
  den vollen Token je wieder auszugeben.
- `/api/v1/...`-Routen sind komplett getrennt von `/api/tenant/...` (eigene
  Auth-Middleware-Funktion `authenticateApiKey()`), damit die
  Session-Cookie-Routen unangetastet bleiben.
- Marktplatz-Vorlagen sind hart codiert (Name, Beschreibung, Kategorie,
  `eventTypes`) — kein Admin-UI zum Verwalten der Vorlagen selbst in v1.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `ApiKey`, `WebhookEndpoint.integrationTemplateKey`, Migration

### Checkpoint: Schema
- [ ] Migration, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `generateApiKey()`/`hashApiKeyToken()` + Tests

### Phase 3: API-Key-Verwaltung
- [ ] Task 3: `GET`/`POST /api/tenant/api-keys`, `DELETE /api/tenant/api-keys/[id]` + Integrationstest

### Phase 4: Öffentliche API
- [ ] Task 4: `authenticateApiKey()`-Helper (Bearer-Header → User)
- [ ] Task 5: `GET /api/v1/projects`, `GET`/`POST /api/v1/tasks` + Integrationstest

### Checkpoint: API
- [ ] Tests grün, Docker: 401 ohne/mit widerrufenem Token, 200 mit gültigem

### Phase 5: Marktplatz
- [ ] Task 6: Vorlagen-Liste + "Installieren"-Route (legt WebhookEndpoint an)
- [ ] Task 7: Marktplatz-Seite + API-Key-UI in Settings → Security

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Token-Leak durch versehentliches Logging | Mittel | Token nie in Response-Objekten außer der einmaligen Erstellungs-Antwort |

## Open Questions
Keine.
