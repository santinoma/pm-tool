# Task List: notifications

Siehe `tasks/plan-notifications.md` und `SPEC-notifications.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `ActivityEvent` (projectId, actorId, type, summary, createdAt, optional taskId), `NotificationPreference` (userId, projectId, level enum all/mentions/off, unique auf [userId, projectId]), `Notification` (userId, activityEventId, readAt).
**Acceptance:** Migration lässt sich anwenden.
**Verify:** `npm run db:tenant:migrate`
**Files:** `prisma/tenant/schema.prisma`
**Scope:** S

---

## Checkpoint: Schema — ✅ erreicht
- [x] Migration angewendet, `npm run build` grün

## Phase 2: Reine Logik

### Task 2: `hasBroadcastMention()` — ✅ erledigt
**Beschreibung:** Reine Funktion, erkennt das Token `@channel` als eigenständiges Wort (nicht als Teil einer E-Mail wie `foo@channel.com`).
**Acceptance:** Erkennt `@channel` am Wortanfang/-ende korrekt; erkennt `foo@channel.com` NICHT als Broadcast.
**Verify:** `tests/notificationsBroadcast.test.ts`
**Files:** `src/tenant/notifications/broadcast.ts`, `tests/notificationsBroadcast.test.ts`
**Scope:** S

### Task 3: `shouldNotify()` — ✅ erledigt
**Beschreibung:** Reine Funktion, entscheidet anhand Präferenz-Level, Actor-Flag, individueller Mention und Broadcast-Mention, ob eine Notification erzeugt wird.
**Acceptance:** Alle Kombinationen aus SPEC-notifications.md Success Criteria abgedeckt (insb. `off` übersteuert nie, eigene Aktion nie).
**Verify:** `tests/notificationsFanout.test.ts`
**Files:** `src/tenant/notifications/fanout.ts`, `tests/notificationsFanout.test.ts`
**Scope:** S

---

## Phase 3: DB-Helper + Integration

### Task 4: `recordActivity()` — ✅ erledigt
**Beschreibung:** Legt einen `ActivityEvent` an und erzeugt für jeden Tenant-User (außer dem Actor) über `shouldNotify()` ggf. eine `Notification`-Zeile; berücksichtigt individuelle Mentions (E-Mail-Liste) und Broadcast-Flag als Parameter.
**Acceptance:** Bei `all`-Präferenz erhält ein anderer Nutzer eine Notification, der Actor selbst nie; bei `off` nie, auch nicht bei Broadcast.
**Verify:** `tests/notifications.test.ts`
**Files:** `src/tenant/notifications/recordActivity.ts`, `tests/notifications.test.ts`
**Scope:** M

### Task 5: Integration in bestehende Routen — ✅ erledigt, via Docker verifiziert
**Beschreibung:** `recordActivity()` wird aufgerufen aus: Task-Erstellung, Task-Status-Änderung, Kommentar-Erstellung (inkl. `hasBroadcastMention`-Check), Anhang-Erstellung, Wiki-Seiten-Erstellung/-Bearbeitung.
**Acceptance:** Jede dieser Aktionen erzeugt einen passenden `ActivityEvent`.
**Verify:** Teil von `tests/notifications.test.ts` + manuell via Docker
**Files:** `src/app/api/tenant/tasks/route.ts`, `src/app/api/tenant/tasks/[id]/route.ts`, `src/app/api/tenant/tasks/[id]/comments/route.ts`, `src/app/api/tenant/tasks/[id]/attachments/route.ts`, `src/app/api/tenant/projects/[id]/wiki/route.ts`, `src/app/api/tenant/wiki/[id]/route.ts`
**Scope:** M

---

## Phase 4: API + UI

### Task 6: Feed — ✅ erledigt, via Docker verifiziert
**Beschreibung:** `GET /api/tenant/projects/[id]/activity` liefert chronologisches Log; `/projects/[id]/activity/page.tsx` zeigt es an.
**Acceptance:** Feed zeigt alle Ereignistypen in absteigender zeitlicher Reihenfolge.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/api/tenant/projects/[id]/activity/route.ts`, `src/app/(tenant)/projects/[id]/activity/page.tsx`
**Scope:** S

### Task 7: Präferenz-Route — ✅ erledigt, via Docker verifiziert
**Beschreibung:** `GET/PATCH /api/tenant/projects/[id]/notification-preference` liest/setzt die eigene Präferenz für dieses Projekt.
**Acceptance:** Default `all` ohne existierende Zeile; PATCH legt/aktualisiert Zeile.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/api/tenant/projects/[id]/notification-preference/route.ts`
**Scope:** S

### Task 8: Postfach — ✅ erledigt, via Docker verifiziert
**Beschreibung:** `GET /api/tenant/notifications` liefert eigene Notifications (neueste zuerst); `PATCH /api/tenant/notifications/[id]/read` markiert gelesen; `/notifications/page.tsx` zeigt Postfach inkl. Präferenz-Umschalter pro Projekt.
**Acceptance:** Ungelesene/gelesene korrekt unterschieden; Markieren als gelesen funktioniert.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/api/tenant/notifications/route.ts`, `src/app/api/tenant/notifications/[id]/read/route.ts`, `src/app/(tenant)/notifications/page.tsx`, `src/app/(tenant)/notifications/NotificationsClient.tsx`
**Scope:** M

---

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria aus SPEC-notifications.md verifiziert (Fanout `all`/`mentions`/`off`, Broadcast respektiert `off`, keine Selbst-Benachrichtigung, Feed, Präferenz-Wechsel, gelesen/ungelesen)
- [x] `npm test` (165 Tests) und `npm run build` grün
- [x] Review mit Mensch vor Abschluss des Moduls
