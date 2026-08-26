# Spec: webhooks

## Objective
Ausgehende Webhooks: Tenant-Admins konfigurieren HTTP-Endpunkte, die bei bestimmten Ereignistypen (Task erstellt, Status geändert, Kommentar, Anhang, Wiki-Seite) benachrichtigt werden — mit automatischem Retry bei Fehlern und einem Delivery-Log zur Fehlersuche.

**Nutzer:** Owner/Admin, die externe Systeme (Slack-Bridge, Automatisierung, eigene Integration) an Tenant-Ereignisse anbinden wollen.

**Erfolg:** Ein konfigurierter, aktivierter Webhook für Typ `task_created` erhält bei jeder Task-Erstellung einen signierten POST-Request; bei einem Fehler wird automatisch mehrfach mit Backoff erneut versucht; jeder Versuch ist im Delivery-Log sichtbar.

## Tech Stack
Next.js (App Router) + TypeScript + PostgreSQL + Prisma — unverändert. Kein externer Queue-Dienst; Retries laufen synchron innerhalb desselben Request-Lebenszyklus, siehe Boundaries.

## Project Structure
```
prisma/tenant/schema.prisma                → WebhookEndpoint, WebhookDelivery
src/tenant/webhooks/signature.ts           → reine Funktion: HMAC-SHA256-Signatur über den Payload-Body
src/tenant/webhooks/dispatch.ts            → DB-Helper: findet passende Endpunkte, sendet mit Retry+Backoff, protokolliert Delivery
src/tenant/notifications/recordActivity.ts → erweitert: ruft nach ActivityEvent-Erstellung dispatchWebhooks() auf
src/app/api/tenant/webhooks/route.ts       → GET/POST eigene Endpunkte (nur owner/admin)
src/app/api/tenant/webhooks/[id]/route.ts  → PATCH/DELETE
src/app/(tenant)/settings/webhooks/page.tsx
tests/webhooksSignature.test.ts
tests/webhooksDispatch.test.ts             → Integrationstest mit lokalem HTTP-Testserver (Node http) statt echtem externen Endpunkt
```

## Code Style
Reine Logik von DB/HTTP getrennt (bestehendes Muster):
```ts
export function signPayload(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}
```

## Testing Strategy
Vitest. `signPayload` ist eine reine Funktion, direkt unit-getestet. Die Zustell-Logik (`dispatchWebhooks`) wird gegen einen im Test hochgefahrenen lokalen `http`-Server getestet (kein echter externer Endpunkt) — einmal erfolgreicher Zustellversuch, einmal ein Server, der die ersten zwei Versuche mit 500 beantwortet und erst beim dritten erfolgreich ist (Retry-Verhalten), einmal ein durchgehend fehlschlagender Server (alle Versuche im Delivery-Log als `failed`). Die Management-Routen werden zusätzlich manuell via Docker/curl verifiziert.

## Boundaries
- **Always:** Jeder Zustellversuch (erfolgreich oder nicht) wird als `WebhookDelivery`-Zeile protokolliert (Status, HTTP-Code oder Fehlertext, Zeitstempel, Versuchsnummer).
- **Ask first:** Wechsel zu asynchroner Zustellung über eine externe Queue (Redis/BullMQ o.ä.) — bewusst nicht in v1, da keine solche Infrastruktur existiert.
- **Never:** Retries dürfen die aufrufende Mutation (z. B. Kommentar erstellen) nicht dauerhaft blockieren — jeder Versuch hat ein Timeout (5s), maximal 3 Versuche mit Backoff (0s, 1s, 3s), danach wird endgültig als `failed` protokolliert und die Mutation läuft normal weiter.

## Success Criteria
- Endpunkt mit `eventTypes: ["task_created"]` erhält bei Task-Erstellung genau einen (im Erfolgsfall) POST mit korrekter HMAC-Signatur im Header.
- Endpunkt, der bei den ersten beiden Versuchen mit 500 antwortet und beim dritten mit 200, hat am Ende einen erfolgreichen `WebhookDelivery`-Eintrag und zwei fehlgeschlagene Zwischenversuche protokolliert.
- Durchgehend fehlschlagender Endpunkt hat nach 3 Versuchen einen finalen `failed`-Delivery-Eintrag, ohne die aufrufende Aktion (z. B. Kommentar-Erstellung) selbst fehlschlagen zu lassen.
- Deaktivierter Endpunkt (`enabled: false`) erhält keine Zustellversuche.
- `member`-Rolle erhält 403 bei Verwaltung von Webhook-Endpunkten.

## Open Questions
Keine — Annahmen (inkl. Retry-Logik) vom Menschen bestätigt.

## Bekannte Einschränkung (dokumentiert, nicht in diesem Modul gelöst)
Da keine Job-Queue-Infrastruktur existiert, laufen Retries synchron innerhalb des ursprünglichen Requests (z. B. Kommentar erstellen). Im Worst Case (3 Versuche × 5s Timeout) kann das die Antwortzeit der auslösenden Aktion um mehrere Sekunden verlängern. Eine echte asynchrone Zustellung wäre eine spätere Verbesserung, sobald eine Queue-Infrastruktur eingeführt wird.
