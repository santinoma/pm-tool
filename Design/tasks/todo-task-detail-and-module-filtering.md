# Task List: task-detail-fields + strict-module-filtering

## Task-Detail-Erweiterung
- [x] Neue Modelle: `Tag`/`TaskTag` (find-or-create per Name), `TaskSubscriber`,
  `Todo` (mit eigenem, optionalem `assigneeId` — unabhängig vom Task-Assignee)
- [x] API: `GET/POST /api/tenant/tags`, `POST/DELETE .../tasks/[id]/tags(/[tagId])`,
  `POST/DELETE .../tasks/[id]/subscribers(/[userId])`,
  `GET/POST .../tasks/[id]/todos`, `PATCH/DELETE .../todos/[todoId]` — alle
  über `assertAnyProjectAccess`/`resolveProjectIdsForTask` abgesichert
- [x] Task-Detail-Seite zeigt jetzt: Status, Assignee (bereits vorhanden),
  Start-/Fälligkeitsdatum, Initial estimate, Tags, Subscriber — unter dem
  Titel: editierbare Description, Dependencies (jetzt mit Überschrift als
  echtes Panel), Attachments, Subtasks (Liste + Schnell-Anlage über den
  bestehenden `parentTaskId`-Mechanismus), To-dos (mit eigenem Assignee je
  Eintrag, Erledigt-Checkbox)
- [x] Integrationstest (`taskDetailExtension.test.ts`, 4 Tests): Tag
  find-or-create ohne Duplikate, Subscriber add/remove, Todo mit eigenem
  Assignee unabhängig vom Task-Assignee, Subtask-Verknüpfung

## Strikte Modul-Filterung im Projekt
- [x] `computeEffectiveModules()`: sichtbare Module = ausgewählte Module ∪
  Module, für die das Projekt bereits echte Daten hat — **selbstheilend**,
  verhindert, dass Projekte von vor dieser Funktion (die nur
  `enabledModules: ["tasks"]` haben) plötzlich ihre echten Wiki-Seiten/
  Budgets/Cycles/Baselines/Check-ins verstecken
- [x] `MODULE_CATALOG` um `cycles`/`baselines`/`check_ins` erweitert (echte,
  im Wizard wählbare Module, jeweils an ihr bestehendes Plan-Feature
  gekoppelt) — Wizard und ProjectSubnav nutzen jetzt denselben Katalog
- [x] `ProjectSubnav` filtert Wiki/Budget/Cycles/Baselines/Check-ins/Activity
  zusätzlich zur bestehenden Plan-Feature-Prüfung nach `enabledModules`.
  Liste/Board/Kalender/Gantt/Hill-Chart/Triage (Kern-Task-Ansichten) und
  Workflow (Kern-Konfiguration) bleiben bewusst immer sichtbar, unabhängig
  von der Modul-Auswahl.
- [x] Bewusste Grenze: nur Sichtbarkeit in der Navigation wird gefiltert,
  keine harte Zugriffssperre auf der Route-Ebene (z. B. ein geteilter
  Wiki-Link bleibt erreichbar, auch wenn der Tab ausgeblendet ist) — passend
  zur wörtlichen Anfrage ("angezeigt werden").
- [x] Tests (`moduleCatalog.test.ts`, +3): explizite Auswahl wird respektiert,
  vorhandene Daten überstimmen eine fehlende Auswahl, `tasks` immer dabei

## Task-Views (Liste/Board/Kalender) + Task-Detail-Layout
- [x] "Meine Tasks" bekommt denselben View-Switcher wie im Projekt: Liste
  (bestehende Tabelle, unverändert), Board (Gruppierung nach
  `statusCategory` statt konkretem Status, da Status-Sets projektabhängig
  sind — bewusst read-only ohne Drag-and-drop, Klick auf Karte führt zur
  Detailseite), Kalender (Gruppierung nach Fälligkeitsdatum, wiederverwendet
  `buildMonthGrid`/`getUtcDateKey` aus der bestehenden Projekt-Kalenderansicht)
- [x] Task-Detail-Seite (`TaskDetailClient.tsx`) auf Zwei-Spalten-Layout
  umgestellt: Hauptinhalt (Titel, Description, Dependencies, Custom Fields,
  Subtasks, To-dos, Anhänge, Kommentare) links, Metadaten-Panel (Status,
  Assignee, Start-/Fälligkeitsdatum, Initial estimate, Tags, Subscriber)
  rechts als sticky Sidebar-Card, alle Felder untereinander gestapelt —
  passend zur Productive.io-Konvention

## Checkpoint: Abschluss
- [x] Tests+Build grün (469/469), Docker-Verifikation, Review

### Docker-E2E-Verifikation (2026-08-26)
- Tag "urgent" angelegt, doppeltes Hinzufügen zum selben Task idempotent
  (keine doppelte Verknüpfung).
- Subscriber hinzugefügt, To-do mit eigenem Assignee angelegt und auf
  erledigt gesetzt, Subtask über den bestehenden Task-Erstellungs-Endpunkt
  mit `parentTaskId` verknüpft.
- Start-/Fälligkeitsdatum und Initial Estimate per PATCH gesetzt und korrekt
  gespeichert.
- Projekt mit `enabledModules: ["wiki"]` angelegt: Budget-Tab initial nicht
  sichtbar → nach Anlegen eines echten Budgets für dieses Projekt automatisch
  sichtbar (selbstheilende Inferenz bestätigt). Cycles-Tab bleibt korrekt
  ausgeblendet (weder ausgewählt noch Daten vorhanden). Wiki-Tab (explizit
  ausgewählt), Workflow- und Liste-Tab (immer sichtbar) korrekt vorhanden.

### Docker-E2E-Verifikation Task-Views + Task-Detail-Layout (2026-08-26)
- `/my-tasks` liefert 200 und rendert den View-Switcher (Liste/Board/
  Kalender-Buttons, Liste initial aktiv).
- Task-Detail-Seite liefert 200 und rendert das Zwei-Spalten-Grid
  (`gridTemplateColumns: 1fr 300px`) mit allen Sidebar-Feldern
  (Startdatum, Fälligkeitsdatum, Initial estimate, Subscriber) sowie den
  Hauptinhalt-Bereichen (Subtasks, Kommentare).
- 132 verwaiste Test-Tenant-Datenbanken aus dieser und vorherigen Sitzungen
  bereinigt.
