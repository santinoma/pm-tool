# Implementation Plan: webhooks

## Overview
Ausgehende, konfigurierbare Webhooks mit HMAC-Signatur, synchronem Retry-mit-Backoff und Delivery-Log, angebunden an die bereits bestehende `recordActivity()`-Infrastruktur aus dem `notifications`-Modul.

## Architecture Decisions
- Kein neuer Event-Typ-Katalog — `WebhookEndpoint.eventTypes` referenziert direkt das bestehende `ActivityEventType`-Enum, keine Duplizierung.
- `dispatchWebhooks()` wird am Ende von `recordActivity()` aufgerufen (ein einziger Integrationspunkt, keine Änderungen an den einzelnen Mutation-Routen nötig — sie rufen bereits `recordActivity()` auf).
- Retry ist synchron mit fixem Backoff-Array `[0, 1000, 3000]` ms und einem 5s-Timeout pro Versuch (via `AbortController`) — bewusst simple Lösung ohne Queue, siehe Spec-Boundaries.
- Für Tests wird ein echter lokaler `http`-Server (Node-Kernmodul) in-process hochgefahren, um HTTP-Verhalten (inkl. mehrfacher Fehlantworten vor Erfolg) realistisch, aber ohne externe Abhängigkeit zu testen.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema erweitern (`WebhookEndpoint`, `WebhookDelivery`)

### Checkpoint: Schema
- [ ] Migration angewendet, `npm run build` grün

### Phase 2: Reine Logik + Zustellung
- [ ] Task 2: `signPayload()` in `src/tenant/webhooks/signature.ts` + Unit-Tests
- [ ] Task 3: `dispatchWebhooks()` in `src/tenant/webhooks/dispatch.ts` (Matching, Retry+Backoff, Delivery-Log) + Integrationstest mit lokalem Test-Server
- [ ] Task 4: Integration in `recordActivity()`

### Phase 3: API + UI
- [ ] Task 5: CRUD-Routen (`GET/POST /api/tenant/webhooks`, `PATCH/DELETE /api/tenant/webhooks/[id]`), nur owner/admin
- [ ] Task 6: `/settings/webhooks/page.tsx` — Endpunkte verwalten + Delivery-Log einsehen; Verlinkung im Settings-Hub

### Checkpoint: Abschluss
- [ ] Integrationstests grün
- [ ] `npm test` und `npm run build` grün
- [ ] Docker/curl: Endpunkt gegen einen lokal laufenden Test-Listener, erfolgreiche + fehlschlagende Zustellung, Signatur-Header korrekt, 403 für member
- [ ] Review mit Mensch vor Abschluss des Moduls

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Synchrone Retries verlangsamen die auslösende Mutation deutlich | Mittel | Fixer, kurzer Backoff (max. ~4s Gesamtwartezeit) + 5s-Timeout pro Versuch; als bekannte Grenze dokumentiert |
| Ein hängender/langsamer externer Endpunkt blockiert den Request lange | Mittel | `AbortController`-Timeout pro Versuch erzwingt eine Obergrenze |
| Secret-Leck über Delivery-Log/UI | Niedrig | Secret wird in der UI nie im Klartext nach der Erstellung angezeigt (nur einmalig bei Erstellung zurückgegeben) |

## Open Questions
Keine — Spec vom Menschen bestätigt.
