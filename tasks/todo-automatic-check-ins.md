# Task List: automatic-check-ins

Siehe `tasks/plan-automatic-check-ins.md` und `SPEC-automatic-check-ins.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `CheckInSchedule` (projectId, question, recurrence enum daily/weekly, dayOfWeek Int? für weekly, enabled Boolean default true, createdAt); `CheckInResponse` (scheduleId, userId, periodKey String, answer String, createdAt, updatedAt, unique auf [scheduleId, userId, periodKey]).
**Acceptance:** Migration lässt sich anwenden.
**Verify:** `npm run db:tenant:migrate`
**Files:** `prisma/tenant/schema.prisma`
**Scope:** S

---

## Checkpoint: Schema — ✅ erreicht
- [x] Migration angewendet, `npm run build` grün

## Phase 2: Reine Logik

### Task 2: `computePeriodKey()` — ✅ erledigt
**Beschreibung:** Reine Funktion, liefert einen stabilen Periodenschlüssel für `daily` (Tagesdatum) oder `weekly` (Montag der Woche, UTC).
**Acceptance:** Zwei Zeitpunkte am selben Tag → gleicher Key bei `daily`; zwei Zeitpunkte derselben Woche (auch an unterschiedlichen Wochentagen) → gleicher Key bei `weekly`; unterschiedliche Wochen → unterschiedlicher Key.
**Verify:** `tests/checkInsPeriod.test.ts`
**Files:** `src/tenant/checkIns/period.ts`, `tests/checkInsPeriod.test.ts`
**Scope:** S

---

## Phase 3: API

### Task 3: Schedule-Routen — ✅ erledigt, via Docker verifiziert (403 für member, 201 für owner)
**Beschreibung:** `GET/POST /api/tenant/projects/[id]/check-ins` — POST legt ein Schedule an, nur owner/admin.
**Acceptance:** 403 für member bei POST; erfolgreiche Erstellung für owner/admin; GET liefert alle Schedules eines Projekts.
**Verify:** `tests/checkIns.test.ts`
**Files:** `src/app/api/tenant/projects/[id]/check-ins/route.ts`, `tests/checkIns.test.ts`
**Scope:** M

### Task 4: Antwort-Route — ✅ erledigt, via Docker verifiziert (Upsert bestätigt: gleiche ID, kein Duplikat)
**Beschreibung:** `GET/POST /api/tenant/check-ins/[id]/responses` — POST ist ein Upsert auf `[scheduleId, userId, periodKey]` (aktuelle Periode wird serverseitig berechnet, nicht vom Client übergeben).
**Acceptance:** Erste Antwort legt einen Eintrag an; zweite Antwort in derselben Periode aktualisiert denselben Eintrag statt einen zweiten anzulegen.
**Verify:** `tests/checkIns.test.ts`
**Files:** `src/app/api/tenant/check-ins/[id]/responses/route.ts`, `tests/checkIns.test.ts`
**Scope:** M

---

## Phase 4: UI

### Task 5: Check-in-Seite — ✅ erledigt, via Docker verifiziert (pending-Status flippt korrekt nach Antwort)
**Beschreibung:** `/projects/[id]/check-ins/page.tsx` — Liste fälliger (noch unbeantworteter) Check-ins mit Antwortformular; Log aller bisherigen Antworten; Schedule-Verwaltung (Anlegen/Aktivieren/Deaktivieren) für owner/admin.
**Acceptance:** Fällig-Status korrekt (verschwindet nach Beantwortung); Log zeigt alle Antworten.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/(tenant)/projects/[id]/check-ins/page.tsx`, `src/app/(tenant)/projects/[id]/check-ins/CheckInsClient.tsx`
**Scope:** M

---

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria aus SPEC-automatic-check-ins.md verifiziert
- [x] `npm test` (210 Tests) und `npm run build` grün
- [x] Review mit Mensch vor Abschluss des Moduls
