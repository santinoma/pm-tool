# Task List: collaboration

Siehe `tasks/plan-collaboration.md` und `SPEC-collaboration.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `Comment`, `Mention`, `Attachment`, `WikiPage` + Rückwärts-Relationen ins Tenant-Schema.
**Acceptance:** Migration lässt sich anwenden.
**Verify:** `npm run db:tenant:migrate`
**Files:** `prisma/tenant/schema.prisma`
**Scope:** S

---

## Phase 2: Reine Logik

### Task 2: mentions.ts & attachmentStorage.ts — ✅ erledigt
**Beschreibung:** `extractMentionedEmails(text)`; `buildStoragePath(taskId, originalFilename)` liefert einen sicheren, UUID-basierten relativen Pfad (Original-Dateiname nur als Anzeigename, nie als Pfadbestandteil).
**Acceptance:** Mehrere/keine/doppelte E-Mail-Erwähnungen werden korrekt erkannt/dedupliziert; Pfad-Funktion erzeugt nie einen Pfad, der Nutzereingaben direkt als Verzeichnis-/Dateinamen-Bestandteil enthält (außer als reine Anzeige-Metadaten).
**Verify:** `tests/mentions.test.ts`, `tests/attachmentStorage.test.ts`
**Files:** `src/tenant/collaboration/mentions.ts`, `src/tenant/collaboration/attachmentStorage.ts`, Tests
**Scope:** S

---

## Checkpoint: Logik-Grundlagen — ✅ erreicht
- [x] Unit-Tests grün, `npm run build` grün

## Phase 3: Task-Detail-Seite

### Task 3: Task-Detail-Seite — ✅ erledigt, verifiziert via Docker
**Beschreibung:** `projects/[id]/tasks/[taskId]/page.tsx` — zeigt Titel, Beschreibung, Status (Dropdown zum Ändern), Assignee, Custom Fields, Abhängigkeiten (blockiert/blockiert durch).
**Acceptance:** Alle vorhandenen Task-Daten sind sichtbar; Statuswechsel über die Seite funktioniert.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/(tenant)/projects/[id]/tasks/[taskId]/page.tsx`, `src/app/(tenant)/projects/[id]/tasks/[taskId]/TaskDetailClient.tsx`
**Scope:** M

---

## Phase 4: Kommentare

### Task 4: Kommentare — ✅ erledigt, Mention-Erzeugung via Docker verifiziert
**Beschreibung:** `POST/GET /api/tenant/tasks/[id]/comments` — POST erkennt Mentions via `extractMentionedEmails`, gleicht gegen bekannte `User.email` ab, legt `Mention`-Einträge nur für Treffer an. Anzeige + Formular auf der Task-Detail-Seite.
**Acceptance:** Kommentar mit bekannter E-Mail erzeugt genau einen `Mention`-Eintrag; unbekannte E-Mail erzeugt keinen Fehler und keinen Mention-Eintrag.
**Verify:** `tests/comments.test.ts`
**Files:** `src/app/api/tenant/tasks/[id]/comments/route.ts`, Erweiterung der Task-Detail-Komponenten, `tests/comments.test.ts`
**Scope:** M

---

## Phase 5: Datei-Anhänge

### Task 5: Datei-Anhänge — ✅ erledigt, byte-identischer Download + 401 ohne Session via Docker verifiziert; Docker-Volume für Uploads ergänzt
**Beschreibung:** `POST /api/tenant/tasks/[id]/attachments` (multipart/form-data), `GET .../attachments`, `GET /api/tenant/attachments/[id]/download` (streamt Datei nach Auth-Prüfung).
**Acceptance:** Hochgeladene Datei ist über die Download-Route byte-identisch wieder abrufbar; Zugriff ohne gültige Session wird abgelehnt.
**Verify:** `tests/attachments.test.ts`
**Files:** `src/app/api/tenant/tasks/[id]/attachments/route.ts`, `src/app/api/tenant/attachments/[id]/download/route.ts`, `tests/attachments.test.ts`
**Scope:** M

---

## Checkpoint: Task-Detail voll funktionsfähig — ✅ erreicht
- [x] Manuell/E2E via Docker: Kommentar mit Mention, Datei-Upload/-Download
- [x] Review mit Mensch vor Fortsetzung (Wiki)

## Phase 6: Wiki

### Task 6: Wiki-Seiten — ✅ erledigt, XSS-Sanitizing via Docker verifiziert
**Beschreibung:** `POST/GET /api/tenant/projects/[id]/wiki`, `PATCH/DELETE /api/tenant/wiki/[id]`. Seiten: Liste, Anlegen, Anzeigen/Bearbeiten. Markdown-Rendering via `marked` + Sanitizing via `isomorphic-dompurify`.
**Acceptance:** Wiki-Seite mit absichtlich eingefügtem `<script>`-Tag im Markdown rendert das Skript NICHT ausführbar.
**Verify:** `tests/wiki.test.ts` (Sanitizing-Test) + manuell im Browser
**Files:** `src/app/api/tenant/projects/[id]/wiki/route.ts`, `src/app/api/tenant/wiki/[id]/route.ts`, `src/app/(tenant)/projects/[id]/wiki/page.tsx`, `src/app/(tenant)/projects/[id]/wiki/new/page.tsx`, `src/app/(tenant)/projects/[id]/wiki/[pageId]/page.tsx`, `src/app/(tenant)/projects/[id]/wiki/[pageId]/WikiPageClient.tsx`, `tests/wiki.test.ts`
**Scope:** M

---

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria aus SPEC-collaboration.md verifiziert
- [x] `npm test` (134 Tests) und `npm run build` grün
- [x] Review mit Mensch vor Abschluss des Moduls
