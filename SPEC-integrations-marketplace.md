# Spec: integrations-marketplace (v2 Modul 11)

## Objective
Zwei Bausteine über die bestehenden Webhooks hinaus: (1) Personal-Access-
Tokens für eine neue öffentliche API (`/api/v1/...`), (2) ein kuratierter
Integrations-Marktplatz, der beim "Installieren" im Hintergrund einen
Webhook-Endpoint anlegt.

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
prisma/tenant/schema.prisma                  → ApiKey, WebhookEndpoint.integrationTemplateKey
src/tenant/apiKeys/apiKeyToken.ts            → reine Token-Generierung/Hash-Vergleich
src/tenant/integrations/templates.ts         → statische Liste der Marktplatz-Vorlagen
src/app/api/tenant/api-keys/route.ts         → GET/POST
src/app/api/tenant/api-keys/[id]/route.ts    → DELETE (widerrufen)
src/app/api/v1/projects/route.ts             → GET (Bearer-Auth)
src/app/api/v1/tasks/route.ts                → GET/POST (Bearer-Auth)
src/app/(tenant)/settings/security/          → UI-Erweiterung: API-Keys
src/app/(tenant)/settings/organization/integrations/  → Marktplatz-Seite
tests/                                        → Unit + Integrationstest
```

## Code Style
Bestehende Muster: Token-Hashing wie bei Passwörtern (`hashPassword`-Stil),
Field-Atlas-CSS, `dispatchWebhooks()`/`WebhookEndpoint` unverändert
wiederverwendet.

## Testing Strategy
Vitest für die reine Token-Logik (Generierung, Hash-Vergleich, Präfix für
Anzeige). Integrationstest: API-Key erstellen → `/api/v1/projects` mit
Token abrufbar → nach Widerruf 401. Marktplatz: Vorlage "installieren"
legt WebhookEndpoint mit korrekten `eventTypes` an. Docker-E2E: `/api/v1`
ohne Token 401, mit gültigem Token 200, mit widerrufenem Token 401;
Marktplatz-Installation erzeugt sichtbaren Webhook-Endpoint.

## Boundaries
- Always: Token wird nur beim Erstellen einmalig im Klartext zurückgegeben,
  danach nur noch der Hash gespeichert (nicht wiederherstellbar).
- Ask first: Vollständige Spiegelung aller ~80 bestehenden
  `/api/tenant`-Routen unter `/api/v1` — bewusst nur ein repräsentativer
  Ausschnitt (Projekte lesen, Tasks lesen/anlegen) für dieses Modul.
- Never: Rohe API-Keys in Logs oder Fehlermeldungen ausgeben.

## Success Criteria
- User kann in Settings → Security einen benannten API-Key erstellen
  (einmalig im Klartext sichtbar) und widerrufen.
- `/api/v1/projects` (GET) und `/api/v1/tasks` (GET/POST) funktionieren
  mit gültigem Bearer-Token, liefern 401 ohne/mit ungültigem/widerrufenem
  Token.
- Der Marktplatz zeigt kuratierte Integrations-Vorlagen; "Installieren"
  legt einen `WebhookEndpoint` mit den passenden `eventTypes` an,
  sichtbar auch auf der bestehenden Webhooks-Seite.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt.
