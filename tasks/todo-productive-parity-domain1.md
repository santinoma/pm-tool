# Task List: Produktiv-Parität Domäne 1 (Projects/Tasks/Views/Docs/Custom Fields)

Quelle: `tasks/plan-productive-parity-roadmap.md`, Domäne 1. Nutzer hat
"Domäne 1 zuerst" gewählt.

## Gruppe A: Task-Flags (klein) — ✅ erledigt
- [x] Key Tasks: `Task.isKeyTask` Boolean, Raute-Icon in der List-View,
  Checkbox im Task-Detail-Sidebar
- [x] Private Tasks: `Task.isPrivate` Boolean + `privateTaskVisibilityFilter()`
  (nur Assignee/Subscriber/owner/admin sehen sie) — angewendet auf List,
  Board, Calendar, Triage, Suche, Task-Detail-Zugriff (404 bei fehlender
  Berechtigung), Client-Portal und öffentliche Shared-Links (dort immer
  hart ausgeschlossen, unabhängig von Rolle). Bewusste Grenze: NICHT auf
  Gantt/Hill-Chart/Cycles/Baselines/Resource-Planning/Dashboard/Reports/
  Portfolios angewendet — dokumentierter Scope-Boundary, siehe
  `privateTaskFilter.ts`-Kommentar. "Meine Tasks" braucht keine Änderung
  (filtert bereits auf `assigneeId: currentUser`, damit inhärent sicher).
  Kein Toggle im NewTaskModal (Erstellung bleibt Linear-Style
  Quick-Capture) — beide Flags werden auf der Task-Detail-Seite gesetzt.
- [x] Task-Dependencies als Pfeile im Gantt — bereits vollständig gebaut
  (`GanttClient.tsx` zeichnet SVG-Linien+Pfeilmarker zwischen `blockedTaskIds`),
  Korrektur der Roadmap-Einschätzung

## Gruppe B: Task-Hierarchie — ✅ erledigt
- [x] `TaskFolder`/`TaskListGroup`-Modelle, `Task.taskListGroupId` optional
- [x] API: `task-folders`, `task-folders/[id]/lists`, `task-list-groups/[id]`
  (Ordner-Löschung mit vorhandenen Listen bewusst 409 statt Kaskade —
  siehe Kommentar im Route-Code); `taskListGroupId` in Task-PATCH/POST
- [x] UI: "Gruppieren: Liste" in List-View, "Liste"-Feld im Task-Detail-
  Sidebar, `/projects/[id]/settings/task-lists` Verwaltungs-UI + Subnav-Tab
- [x] Test: `taskFolders.test.ts` (3 Tests)

## Gruppe C: Gespeicherte/teilbare Views — ✅ erledigt
- [x] `SavedView`-Modell (Projekt- oder "Meine Tasks"-scoped)
- [x] API: CRUD `/api/tenant/saved-views`, Owner/Admin-Berechtigung,
  `sharedWithAll` nur für Projekt-Scope (400 bei my_tasks)
- [x] UI: `SavedViewsBar`-Komponente in List-View und Meine-Tasks
- [x] Dynamischer "Ich"-Filter: `resolveViewFilters()` löst `"__ME__"`
  Sentinel erst beim Anwenden auf (nicht persistiert)
- [x] Tests: `savedViews.test.ts` (8), `resolveViewFilters.test.ts` (5)

## Gruppe D: Task-Templates — ✅ erledigt
- [x] `Task.isTemplate` Boolean
- [x] API: `POST /api/tenant/tasks` mit `templateTaskId` → kopiert Titel/
  Description/Custom-Field-Werte/Subtasks/Todos (nicht Status/Assignee/
  Termine/Kommentare/Anhänge)
- [x] UI: "Als Vorlage speichern" auf Task-Detail, Vorlagen-Auswahl im
  NewTaskModal (Titel dann optional)
- [x] Test: `taskTemplates.test.ts` (2 Tests)

## Gruppe E: Bulk-Task-Editing — ✅ erledigt
- [x] `PATCH`/`DELETE /api/tenant/tasks/bulk` — Zuweisen/Status/
  Fälligkeitsdatum-Verschiebung/Löschen, pro Task Zugriffsprüfung
  (verweigerte werden übersprungen, nicht Fehler für den ganzen Batch)
- [x] UI: Mehrfachauswahl-Checkboxen + Action-Bar in List-View
- [x] Test: `bulkTaskEdit.test.ts` (4 Tests)

## Gruppe F: Wiederkehrende Tasks — ✅ erledigt
- [x] `Task.recurrence` (JSON), `Task.recurrenceParentId`
- [x] `computeNextDueDate()` (reine Funktion, Monatslängen-Randfälle
  geklemmt, z.B. 31. Jan + 1 Monat → 28./29. Feb statt März)
- [x] Bei Status-Wechsel auf `done`-Kategorie: neue Instanz mit Titel/
  Custom-Fields/Subtasks/Todos, verkettet über `recurrenceParentId`
  zur Wurzel — Fehler dabei blockieren die eigentliche Status-Änderung
  nicht (try/catch, kein Rethrow)
- [x] UI: "Wiederholung"-Sektion im Task-Detail-Sidebar
- [x] Test: `computeNextOccurrence.test.ts` (15 Tests)

## Gruppe G: Custom Fields auf Docs + Doc-Templates + Sharing — ✅ erledigt
- [x] `CustomFieldEntityType` um `wiki_page` erweitert, `WikiPageCustomFieldValue`
- [x] `WikiPage.isTemplate`, Vorlagen-Auswahl bei Neuanlage
- [x] `SharedWikiLink` + `/shared-doc/[token]` (öffentlich, unauthentifiziert,
  analog zum bestehenden `SharedView`/`/shared/[token]`-Muster)
- [x] "Teilen"-Panel + Custom-Fields-Sektion in `WikiPageClient.tsx`
- [x] Test: `wikiPageExtensions.test.ts` (5 Tests)
- Bewusst nicht gebaut: PDF-Export für Wiki-Seiten (aus dem ursprünglichen
  Plan gestrichen — kein bestehendes PDF-Rendering im Projekt, wäre eine
  neue Infrastruktur-Abhängigkeit; Markdown-Rendering + öffentlicher Link
  deckt den Kern-Anwendungsfall "Doku extern teilen" bereits ab)

### Umsetzung: 6 parallele Agenten (2026-08-26)
Nach vorab durchgeführter, gebündelter Schema-Migration (2 Migrationen:
Folders/Lists/Templates/Recurrence/Views, dann Docs-Custom-Fields/
Templates/Sharing) liefen alle 6 Gruppen als parallele General-Purpose-
Agenten auf demselben Codestand — inkl. gemeinsam bearbeiteter Dateien
(`ListClient.tsx`, `page.tsx`, `tasks/[id]/route.ts`) ohne Konflikte, da
jeder Agent vor dem Schreiben neu gelesen hat. Zentral verifiziert (nicht
von den Agenten selbst, um Commit-Kontrolle zu behalten): Build + volle
Testsuite grün (527/527, davon 42 neue Tests), Docker-E2E aller 6 Features
end-to-end durchgespielt (Folder→Liste→Task-Zuordnung, Template-Task→neue
Instanz mit korrekt NICHT kopiertem Status/Assignee, Bulk-Fälligkeits-
Verschiebung +3 Tage rechnerisch verifiziert, gespeicherte Projekt-View mit
`__ME__`-Sentinel, Wiki-Vorlage-Flag + öffentlicher anonymer Link liefert
echten Titel/Inhalt). Eine versehentlich von einem Agenten gelöschte
`.impeccable/design.json` (Design-Lint-Cache, außerhalb des Scopes) wurde
wiederhergestellt. 337 verwaiste Test-DBs bereinigt.

## Zwischenstopp: Apple-Design-Anfrage (2026-08-26)
Nutzer bat zwischendurch: "passe die UI komplett an, wie Productive, nur im
Apple Design". Untersuchung ergab: die App läuft bereits vollständig im
Apple-HIG-Design (`globals.css`-Kommentar bestätigt es, Git-History zeigt
Commit `943d732 "Migrate the Apple-HIG design from Dashboard to the whole
app"`, nach einer früheren „Field Atlas"-Iteration) — `DESIGN.md` und der
Direction-Contract-Kommentar in `layout.tsx` waren aber seit dieser
Migration nie aktualisiert worden und beschrieben noch das verworfene
Field-Atlas-System. Beides auf den echten, ausgelieferten Stand
korrigiert (`DESIGN.md` neu geschrieben aus `globals.css` als Ground
Truth, Contract-Kommentar aktualisiert), per Docker verifiziert (echtes
`#0071e3` + `backdrop-filter: blur(20px)` im ausgelieferten CSS). Kein
Rebuild nötig — das gewünschte Ergebnis existierte bereits.

## Layout-Abgleich mit echten Productive.io-Screenshots (2026-08-26)
Nutzer bat: "Passe alle Seiten und Features nahe an productive.io an. In
allen Artikeln sind auch Bilder von der UI." — 6 parallele Agenten haben
echte Screenshots aus den help.productive.io-Artikeln heruntergeladen
(via curl + intercomcdn-Bild-URLs) und visuell mit unseren Seiten
verglichen, dann STRUKTURELLE Anpassungen vorgenommen (Toolbar-Anordnung,
Feld-Reihenfolge, Gruppierung) — bewusst ohne die Apple-HIG-Skin
(Farben/Fonts/Radius/Schatten) anzufassen:
- **List/Board**: Gruppieren-Control hinzugefügt, Tasks nach Status in
  einklappbaren Gruppen (Chevron + LegendKey-Pill + Anzahl) statt flacher
  Tabelle; Board-Spaltenköpfe nutzen jetzt dieselbe LegendKey-Pille.
- **Task-Detail**: Anhänge direkt unter Description verschoben (vor
  Subtasks), Sidebar-Reihenfolge auf Status→Assignee→Daten→Estimate→
  Subscriber→Tags→Custom-Fields gebracht (Custom Fields jetzt in der
  Sidebar statt im Hauptbereich).
- **Dashboard**: Widget-Icons ergänzt, Tabellen-Widgets (Überfällige/
  Meine Tasks) spannen jetzt 2 von 3 Grid-Spalten und gruppieren nach
  Projekt statt Projektname pro Zeile zu wiederholen.
- **Meine Tasks**: Toolbar auf eine Zeile reduziert (Task-Zähler neben
  Titel), Liste nach Projekt gruppiert (wiederverwendet `.board-col-header`).
- **Projekt-Wizard**: Nummerierte Kreis-Schrittanzeige statt Text-Labels,
  zentrierte Überschriften, Farbwahl inline im Namensfeld, Modul-Auswahl
  als 2-spaltiges Karten-Grid statt Checkbox-Liste, Buttons primary-first.
- **Budget-Editor**: Tab-Leiste nutzt jetzt `.subnav` (Unterstrich) statt
  Pill-Buttons, Service-Tabellen-Spalten neu geordnet (Section/Service→
  Quantity→Price→Budget Total→Used→Remaining→Usage%→Guaranteed Max),
  Usage% als echte Scale-Bar, Billing-Type als Pill neben dem Namen.

Zentral verifiziert (nicht von den Agenten selbst, um Commit-Kontrolle zu
behalten): Build + volle Testsuite grün nach Zusammenführung aller 6
Änderungen, Docker-E2E (alle 6 Seiten liefern 200, neue Markup-Marker
bestätigt: Gruppieren-Control, Sidebar-Reihenfolge, Zwei-Spalten-Grid,
Kreis-Schrittanzeige), 140 verwaiste Test-DBs bereinigt.

## Checkpoint: Abschluss
- [x] Tests+Build grün (527/527), Docker-Verifikation aller Gruppen
- [ ] Review mit Mensch vor Abschluss des Moduls
