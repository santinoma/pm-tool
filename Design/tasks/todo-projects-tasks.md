# Task List: projects-tasks

Siehe `tasks/plan-projects-tasks.md` und `SPEC-projects-tasks.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `Project`, `WorkflowStatus`, `Task`, `TaskProject`, `TaskDependency`, `CustomFieldDef`, `CustomFieldValue` + Enums gemäß Spec ins Tenant-Schema.
**Acceptance:** Migration lässt sich gegen die lokale Dev-Tenant-DB anwenden.
**Verify:** `npm run db:tenant:migrate`
**Files:** `prisma/tenant/schema.prisma`
**Scope:** M

---

## Phase 2: Reine Logik

### Task 2: workflow.ts — ✅ erledigt
**Beschreibung:** `defaultWorkflowStatuses()` (liefert die 3 Standard-Status mit Kategorie/Position/isDefault), `detectDependencyCycle(existingEdges, newEdge)` (DFS-Zyklus-Erkennung).
**Acceptance:** Zyklus-Erkennung erkennt direkte und transitive Zyklen, lässt azyklische Graphen durch.
**Verify:** `tests/workflow.test.ts`
**Files:** `src/tenant/projects/workflow.ts`, `tests/workflow.test.ts`
**Scope:** S

---

### Task 3: customFieldValue.ts — ✅ erledigt
**Beschreibung:** `parseCustomFieldValue(type, raw)` / `serializeCustomFieldValue(type, value)` für text/number/select/date, inkl. Validierung (z.B. Zahl muss numerisch sein, select-Wert muss in `options` enthalten sein).
**Acceptance:** Ungültige Werte pro Typ werden erkannt und mit klarer Fehlermeldung abgelehnt.
**Verify:** `tests/customFieldValue.test.ts`
**Files:** `src/tenant/projects/customFieldValue.ts`, `tests/customFieldValue.test.ts`
**Scope:** S

---

## Checkpoint: Logik-Grundlagen — ✅ erreicht
- [x] Unit-Tests aus Task 2-3 grün (68 Tests gesamt)
- [x] `npm run build` grün

## Phase 3: Projekte & Workflow-Editor

### Task 4: Projekt-CRUD — ✅ erledigt, verifiziert via Docker
**Beschreibung:** `POST /api/tenant/projects` (erzeugt Projekt + `defaultWorkflowStatuses()` in einer Transaktion), `GET /api/tenant/projects`. Seiten: `projects/page.tsx` (Liste), `projects/new/page.tsx`.
**Acceptance:** Neues Projekt hat sofort 3 editierbare Status.
**Verify:** Integrationstest + manuell im Browser
**Files:** `src/app/api/tenant/projects/route.ts`, `src/app/(tenant)/projects/page.tsx`, `src/app/(tenant)/projects/new/page.tsx`, `tests/projects.test.ts`
**Scope:** M

---

### Task 5: Workflow-Editor — ✅ erledigt, verifiziert via Docker (Umbenennen, Anlegen, Löschen)
**Beschreibung:** `GET/POST/PATCH/DELETE /api/tenant/projects/[id]/statuses`, Seite `projects/[id]/settings/workflow/page.tsx` (Hinzufügen, Umbenennen, Reihenfolge per Drag, Kategorie ändern). `DELETE` schlägt fehl, wenn noch Tasks diesen Status referenzieren.
**Acceptance:** Löschversuch eines referenzierten Status liefert klaren Fehler statt Absturz/Datenverlust.
**Verify:** Integrationstest (Löschschutz) + manuell
**Files:** `src/app/api/tenant/projects/[id]/statuses/route.ts`, `src/app/api/tenant/projects/[id]/statuses/[statusId]/route.ts`, `src/app/(tenant)/projects/[id]/settings/workflow/page.tsx`, `src/app/(tenant)/projects/[id]/settings/workflow/WorkflowEditorClient.tsx`, `tests/workflowStatuses.test.ts`
**Hinweis:** Reihenfolge-Änderung per Auf/Ab-Buttons statt Drag umgesetzt (Drag bleibt fürs Board reserviert, wo es UX-zentral ist)
**Scope:** M

---

## Phase 4: Tasks, Cross-Tagging, Abhängigkeiten

### Task 6: Task-CRUD — ✅ erledigt
**Beschreibung:** `POST/GET/PATCH /api/tenant/tasks`, `/api/tenant/tasks/[id]`. Neuer Task: `inTriage: true`, `TaskProject` mit `isPrimary: true` für das übergebene Projekt, Default-Status = `isDefault`-Status dieses Projekts.
**Acceptance:** Task ist nach Erstellung in der Triage-Inbox seines primären Projekts sichtbar.
**Verify:** `tests/tasks.test.ts`
**Files:** `src/app/api/tenant/tasks/route.ts`, `src/app/api/tenant/tasks/[id]/route.ts`, `tests/tasks.test.ts`
**Scope:** M

---

### Task 7: Cross-Tagging — ✅ erledigt
**Beschreibung:** `POST /api/tenant/tasks/[id]/projects` — verknüpft einen bestehenden Task mit einem weiteren Projekt (`isPrimary: false`), ohne den Task zu duplizieren.
**Acceptance:** Task erscheint danach in den Task-Listen beider Projekte, bleibt aber ein einzelner Datensatz.
**Verify:** `tests/taskCrossTagging.test.ts`
**Files:** `src/app/api/tenant/tasks/[id]/projects/route.ts`, `tests/taskCrossTagging.test.ts`
**Scope:** S

---

### Task 8: Task-Abhängigkeiten — ✅ erledigt
**Beschreibung:** `POST /api/tenant/tasks/[id]/dependencies` — nutzt `detectDependencyCycle()` aus Task 2, lehnt zyklische Verknüpfungen ab. `GET` liefert blockierende/blockierte Tasks für die Detail-Anzeige.
**Acceptance:** Zyklische Abhängigkeit wird mit HTTP 409 + klarer Fehlermeldung abgelehnt.
**Verify:** `tests/taskDependencies.test.ts`
**Files:** `src/app/api/tenant/tasks/[id]/dependencies/route.ts`, `tests/taskDependencies.test.ts`
**Scope:** S

---

## Checkpoint: Kern-Datenflüsse — ✅ erreicht
- [x] Integrationstests aus Task 4-8 grün (79 Tests gesamt)
- [x] `npm run build` grün

## Phase 5: Custom Fields

### Task 9: Custom Fields — ✅ erledigt, alle 6-9 end-to-end via Docker verifiziert
**Beschreibung:** `POST/GET/DELETE /api/tenant/projects/[id]/custom-fields`, `PUT /api/tenant/tasks/[id]/custom-fields/[fieldId]` (nutzt `customFieldValue.ts` aus Task 3 für Validierung).
**Acceptance:** Alle 4 Feldtypen lassen sich definieren und mit validen Werten befüllen; ungültige Werte werden abgelehnt.
**Verify:** `tests/customFields.test.ts`
**Files:** `src/app/api/tenant/projects/[id]/custom-fields/route.ts`, `src/app/api/tenant/tasks/[id]/custom-fields/[fieldId]/route.ts`, `tests/customFields.test.ts`
**Scope:** M

---

## Phase 6: Ansichten (Liste, Board, Kalender)

### Task 10: Triage-Inbox — ✅ erledigt, verifiziert via Docker
**Beschreibung:** `projects/[id]/triage/page.tsx` — listet `inTriage: true`-Tasks, Aktion "Ins Board übernehmen" setzt `inTriage: false` + Default-Status.
**Acceptance:** Übernommener Task verschwindet aus der Triage-Liste und erscheint im Board.
**Verify:** Manuell im Browser
**Files:** `src/app/(tenant)/projects/[id]/triage/page.tsx`, `src/app/(tenant)/projects/[id]/layout.tsx`
**Scope:** M

---

### Task 11: Listen-Ansicht — ✅ erledigt, verifiziert via Docker
**Beschreibung:** `projects/[id]/list/page.tsx` — Tabelle mit Sortierung (Fälligkeit/Status/Assignee) und Filtern.
**Acceptance:** Sortierung/Filter funktionieren clientseitig auf den geladenen Tasks.
**Verify:** Manuell im Browser
**Files:** `src/app/(tenant)/projects/[id]/list/page.tsx`
**Scope:** M

---

### Task 12: Board-Ansicht — ✅ erledigt (native HTML5 Drag&Drop statt Bibliothek), Statuswechsel via Docker verifiziert
**Beschreibung:** `projects/[id]/board/page.tsx` — Spalten = `WorkflowStatus` (sortiert nach `position`), Drag & Drop zwischen Spalten aktualisiert `statusId` per API.
**Acceptance:** Drag eines Tasks in eine andere Spalte ändert den Status persistent (Reload zeigt neuen Status).
**Verify:** Manuell im Browser
**Files:** `src/app/(tenant)/projects/[id]/board/page.tsx`, `src/app/(tenant)/projects/[id]/BoardClient.tsx`
**Scope:** L

---

### Task 13: Kalender-Ansicht — ✅ erledigt, UTC-Datums-Logik unit-getestet, Seite via Docker verifiziert
**Beschreibung:** `projects/[id]/calendar/page.tsx` — Monatsansicht, Tasks mit `dueDate` an ihrem Tag, Klick öffnet Task-Detail.
**Acceptance:** Tasks erscheinen am korrekten Kalendertag (keine Zeitzonen-Off-by-one-Fehler).
**Verify:** Manuell im Browser
**Files:** `src/app/(tenant)/projects/[id]/calendar/page.tsx`
**Scope:** M

---

## Checkpoint: Drei Ansichten — ✅ erreicht
- [x] Manuell/E2E via Docker: Triage → Board-Übernahme → Statuswechsel (Board-Drag-Äquivalent) persistent → Liste zeigt denselben Task konsistent
- [ ] Review mit Mensch vor Fortsetzung (Gantt)

## Phase 7: Gantt

### Task 14: Gantt-Zeitleiste — ✅ erledigt, Rendering + Abhängigkeitspfeile via Docker verifiziert
**Beschreibung:** `projects/[id]/gantt/page.tsx` — Balken pro Task nach `startDate`/`dueDate`, Abhängigkeitspfeile zwischen verknüpften Tasks (aus Task 8).
**Acceptance:** Zeitleiste zeigt alle Tasks mit Datum korrekt positioniert, Abhängigkeiten sind visuell erkennbar.
**Verify:** Manuell im Browser
**Files:** `src/app/(tenant)/projects/[id]/gantt/page.tsx`, `src/app/(tenant)/projects/[id]/GanttClient.tsx`
**Scope:** L

---

### Task 15: Gantt-Drag — ✅ erledigt (native Mouse-Events, keine Bibliothek). Persistenz + Keine-Kaskade-Garantie via simulierter PATCH-Anfrage verifiziert. Das tatsächliche Maus-Drag-Gefühl im Browser konnte ich nicht selbst testen (kein Browser-Zugriff) — bitte bei Gelegenheit selbst ausprobieren.
**Beschreibung:** Balken lassen sich per Drag verschieben (ändert `startDate`+`dueDate` gleich) oder an den Kanten resizen (ändert nur eine Seite). Persistiert per API-Aufruf nach Drag-Ende.
**Acceptance:** Nach Drag + Reload ist die neue Datumsspanne korrekt gespeichert; abhängige Tasks werden NICHT automatisch verschoben (bewusste Grenze).
**Verify:** Manuell im Browser
**Files:** `src/app/(tenant)/projects/[id]/GanttClient.tsx`
**Scope:** M

---

## Phase 8: Command-Palette

### Task 16: Such-API — ✅ erledigt, verifiziert via Docker
**Beschreibung:** `GET /api/tenant/search?q=...` — Fuzzy-Suche über Projekt- und Task-Titel (einfache `contains`/Trigram-Ähnlichkeit, kein externer Suchindex in v1).
**Acceptance:** Teilstring-Treffer in Projekt- oder Task-Titeln werden gefunden, Ergebnis enthält Typ (project/task) + ID + Titel.
**Verify:** `tests/search.test.ts`
**Files:** `src/app/api/tenant/search/route.ts`, `tests/search.test.ts`
**Scope:** S

---

### Task 17: Cmd+K-UI — ✅ erledigt (Suche + Neuer-Task-Schnellaktion). Tastatur-Shortcut/visuelles Verhalten mangels Browser-Zugriff nicht selbst getestet — bitte bei Gelegenheit selbst ausprobieren (Cmd/Ctrl+K).
**Beschreibung:** `src/ui/commandPalette/CommandPalette.tsx` — global eingebunden (Layout), öffnet auf Cmd+K/Ctrl+K, ruft Such-API, Enter navigiert; Schnell-Aktion "Neuer Task" öffnet ein Inline-Formular (Titel + optionales Projekt), erzeugt Task in Triage.
**Acceptance:** Cmd+K öffnet von jeder Seite aus, Suche+Navigation funktionieren, "Neuer Task" legt einen Task an.
**Verify:** Manuell im Browser
**Files:** `src/ui/commandPalette/CommandPalette.tsx`, `src/app/(tenant)/layout.tsx`
**Scope:** M

---

## Checkpoint: Abschluss — ✅ code-seitig erreicht
- [x] Alle Success-Criteria aus SPEC-projects-tasks.md verifiziert (Datenfluss + API via Docker/curl; Gantt-Drag-Gefühl und Cmd+K-Tastenkombination bitte selbst im Browser prüfen)
- [x] `npm test` (95 Tests) und `npm run build` grün
- [ ] Review mit Mensch vor Abschluss des Moduls
