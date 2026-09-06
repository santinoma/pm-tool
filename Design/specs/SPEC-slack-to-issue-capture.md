# Spec: slack-to-issue-capture (v2 Modul 13)

## Objective
Eine externe Nachricht (Linear-Style "Asks") wird über einen signierten
Endpunkt zu einem strukturierten Task. **Grenze:** Keine echte
Slack-App/Workspace-Verbindung in dieser Umgebung — Slacks
Signatur-Prüfverfahren (öffentlich dokumentiert, HMAC-SHA256) wird jedoch
vollständig selbst implementiert und getestet.

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
prisma/tenant/schema.prisma                  → SlackCaptureConfig, Task.externalSourceUrl
src/tenant/slackCapture/verifySignature.ts   → reine Signatur-Prüfung (Slacks HMAC-Verfahren)
src/tenant/slackCapture/buildTaskDraft.ts    → reine Payload→Task-Aufbereitung
src/app/api/tenant/integrations/slack/capture/route.ts  → POST (signaturgeprüft)
src/app/api/tenant/organization/slack-capture/route.ts  → GET/PATCH (Konfiguration)
src/app/(tenant)/settings/organization/  → UI-Erweiterung: Slack-Capture-Konfiguration
tests/                                        → Unit + Integrationstest
```

## Code Style
Bestehende Muster: `canManageMembers`-Guard für Konfiguration,
Field-Atlas-CSS, `crypto`-basierte HMAC wie bei Webhook-Secrets.

## Testing Strategy
Vitest: Signatur-Prüfung gegen ein selbst erzeugtes Secret (gültig/falsch/
abgelaufener Timestamp — Slack verlangt ±5 Minuten Toleranz), Task-Draft-
Aufbereitung (Titel aus erster Zeile, Volltext in Beschreibung). Docker-E2E:
Capture-Request mit korrekter Signatur legt Task an; falsche Signatur
liefert 401; Konfiguration (Standard-Projekt, an/aus) wirkt.

## Boundaries
- Always: Ohne gültige Signatur wird niemals ein Task angelegt.
- Ask first: OAuth-Installation einer echten Slack-App, Events-API-
  Subscription-Handshake (`url_verification`-Challenge) — bewusst
  außerhalb des Scopes, da kein echter Workspace zum Testen existiert.
- Never: Ein `externalSourceUrl` als Pflichtfeld erzwingen — bestehende,
  intern angelegte Tasks bleiben unverändert nutzbar.

## Success Criteria
- Owner/Admin kann in Settings → Organization ein Signing Secret und ein
  Standard-Projekt für Slack-Capture hinterlegen und aktivieren.
- `POST /api/tenant/integrations/slack/capture` mit gültiger Signatur legt
  einen Task im konfigurierten Projekt an (Titel = erste Zeile, Volltext in
  Beschreibung, `externalSourceUrl` gesetzt).
- Ungültige oder fehlende Signatur liefert 401, kein Task wird angelegt.
- Deaktivierte Konfiguration lehnt Capture-Requests ab.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert (Mechanik).

## Open Questions
Keine — Annahmen wurden bestätigt, inkl. der Testbarkeits-Grenze.
