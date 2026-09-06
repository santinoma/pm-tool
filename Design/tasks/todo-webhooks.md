# Task List: webhooks

Siehe `tasks/plan-webhooks.md` und `SPEC-webhooks.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `WebhookEndpoint` (url, secret, eventTypes ActivityEventType[], enabled Boolean default true, createdAt); `WebhookDelivery` (endpointId, activityEventId optional, attempt Int, statusCode Int?, errorMessage String?, success Boolean, createdAt).
**Acceptance:** Migration lässt sich anwenden.
**Verify:** `npm run db:tenant:migrate`
**Files:** `prisma/tenant/schema.prisma`
**Scope:** S

---

## Checkpoint: Schema — ✅ erreicht
- [x] Migration angewendet, `npm run build` grün

## Phase 2: Reine Logik + Zustellung

### Task 2: `signPayload()` — ✅ erledigt
**Beschreibung:** Reine Funktion, HMAC-SHA256 über den JSON-Body mit dem Endpunkt-Secret.
**Acceptance:** Gleicher Body + Secret → gleiche Signatur; unterschiedliches Secret → unterschiedliche Signatur.
**Verify:** `tests/webhooksSignature.test.ts`
**Files:** `src/tenant/webhooks/signature.ts`, `tests/webhooksSignature.test.ts`
**Scope:** S

### Task 3: `dispatchWebhooks()` — ✅ erledigt, via Docker verifiziert (Signatur korrekt, Retry-Timing 0s/1s/3s)
**Beschreibung:** Findet aktivierte Endpunkte, die den Ereignistyp abonniert haben; sendet POST mit Signatur-Header; bei Fehler bis zu 3 Versuche mit Backoff `[0, 1000, 3000]`ms und 5s-Timeout pro Versuch; protokolliert jeden Versuch als `WebhookDelivery`.
**Acceptance:** Erfolgreicher Server → ein `WebhookDelivery`-Eintrag, `success: true`. Server der 2× 500 dann 200 liefert → 3 Einträge, letzter `success: true`. Durchgehend fehlschlagender Server → 3 Einträge, alle `success: false`, kein Fehler propagiert an den Aufrufer.
**Verify:** `tests/webhooksDispatch.test.ts` (lokaler `http`-Testserver)
**Files:** `src/tenant/webhooks/dispatch.ts`, `tests/webhooksDispatch.test.ts`
**Scope:** M

### Task 4: Integration in `recordActivity()` — ✅ erledigt, via Docker verifiziert
**Beschreibung:** Nach Erstellung des `ActivityEvent` wird `dispatchWebhooks()` aufgerufen (awaited, aber Fehler werden intern abgefangen, nie an den Aufrufer von `recordActivity()` propagiert).
**Acceptance:** Bestehende Aufrufer von `recordActivity()` (Task/Kommentar/Anhang/Wiki-Routen) funktionieren unverändert, lösen zusätzlich Webhook-Zustellung aus.
**Verify:** Teil von `tests/webhooksDispatch.test.ts` + bestehende `notifications`-Tests bleiben grün
**Files:** `src/tenant/notifications/recordActivity.ts`
**Scope:** S

---

## Phase 3: API + UI

### Task 5: CRUD-Routen — ✅ erledigt, via Docker verifiziert (403 für member, Secret nur einmalig zurückgegeben)
**Beschreibung:** `GET/POST /api/tenant/webhooks`, `PATCH/DELETE /api/tenant/webhooks/[id]`, nur owner/admin. `POST` generiert ein Secret und gibt es genau einmal im Response zurück.
**Acceptance:** 403 für member; erfolgreiche Erstellung/Bearbeitung/Löschung für owner/admin.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/api/tenant/webhooks/route.ts`, `src/app/api/tenant/webhooks/[id]/route.ts`
**Scope:** M

### Task 6: Verwaltungsseite — ✅ erledigt, via Docker verifiziert
**Beschreibung:** `/settings/webhooks/page.tsx` — Endpunkte anlegen/bearbeiten/löschen/aktivieren, Event-Typen auswählen, letzte Delivery-Log-Einträge pro Endpunkt einsehen; Verlinkung von `/settings`.
**Acceptance:** Alle CRUD-Aktionen funktionieren manuell im Browser; Delivery-Log ist sichtbar.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/(tenant)/settings/webhooks/page.tsx`, `src/app/(tenant)/settings/webhooks/WebhooksClient.tsx`, `src/app/(tenant)/settings/page.tsx`
**Scope:** M

---

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria aus SPEC-webhooks.md verifiziert (Signatur, Retry mit 3 protokollierten Versuchen, aufrufende Mutation nicht blockiert/fehlgeschlagen, disabled/nicht-abonniert liefert nicht, 403 für member)
- [x] `npm test` (196 Tests) und `npm run build` grün
- [x] Review mit Mensch vor Abschluss des Moduls
