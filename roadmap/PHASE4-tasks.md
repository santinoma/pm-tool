# Phase 4 — Tasks-Uneinheitlichkeit, Permission Sets, Task-Struktur-Audit

Entstanden aus einem erneuten, gezielten Productive.io-Doku-Durchlauf (17.09.2026) auf
konkreten Nutzer-Hinweis: "Task ist uneinheitlich" + "erstelle Standard-Gruppen/
Permissions anhand der Doku (ersetzt Admin/Owner)". Ergänzt `tasks.md` (Phase 0–3,
abgeschlossen) um einen neuen, noch offenen Themenblock. Gleiche Arbeitsweise wie dort
(siehe `spec.md`): Task lesen, gegen `mcp__Productive__search_help` verifizieren,
umsetzen, testen, abhaken.

## T401 — Task-Detail: Slide-Over vs. Vollseite uneinheitlich (BEHOBEN)

**Befund:** Kein Feature-Unterschied, sondern ein reiner CSS-Layout-Bug. Task-Detail wird
aus zwei Kontexten erreicht — Klick auf eine Task-Zeile in List/Board/Table/My-Tasks
(intercepted von Next.js' Parallel-Route `@modal/(.)tasks/[taskId]/page.tsx`, gerendert in
`TaskSlideOver`, `max-w-3xl` = 768px) vs. Klick auf einen Subtask-Link von einer bereits
offenen Task-Detail-Seite aus (keine Interception, volle Seite, kein Breiten-Limit) — beide
rendern exakt dieselbe `TaskDetailClient`-Komponente mit identischen Props/API-Calls.

Der zweispaltige Grid (`lg:grid-cols-[1fr_300px]`, `TaskDetailClient.tsx`) nutzte einen
**Viewport**-Breakpoint (`min-width: 1024px`, ausgewertet gegen die Browser-Fensterbreite),
nicht die tatsächliche Breite des Slide-Over-Drawers (nur 768px). Auf jedem normalen
Desktop-Viewport feuerte der Breakpoint also auch im schmalen Drawer, quetschte die
300px-Sidebar (Status/Liste/Assignee/Termine/Toggles/Custom Fields) und die Aktionsleiste
zusammen — das erklärt den Eindruck "nur ~30% und falsche Funktionen", obwohl inhaltlich
100% identisch (gleiche Subtasks/Dependencies/Todos/Custom Fields/Kommentare/Anhänge/
Zeiterfassung in beiden).

**Fix (umgesetzt):** `@container`-Query statt Viewport-Breakpoint — `TaskDetailClient.tsx`
misst jetzt die tatsächliche Breite des Elements selbst (`@3xl:grid-cols-[1fr_300px]`,
768px-Schwelle), nicht die Fensterbreite. Drawer (≈719px Inhaltsbreite) bleibt einspaltig,
Vollseite (bis 1024px) zweispaltig — beide korrekt, per Playwright gegen den Demo-Tenant
verifiziert (Screenshot-Vergleich Drawer vs. Vollseite).

- [x] Fix umgesetzt, `tsc`/`eslint` grün, Playwright-verifiziert.

## T402 — Permission Sets: Standard-Gruppen laut Productive-Doku (ersetzt Owner/Admin/Member/Client)

**Rechercheergebnis** (`mcp__Productive__search_help`, Artikel 16917656 "Default
Permission Sets", 9234582 "Permission Set Management"): Productive kennt für neu
angelegte Organisationen (ab Mitte August 2026) genau acht Standard-
Berechtigungsprofile, keine freie Owner/Admin/Member/Client-Vierteilung wie bisher in
dieser Codebase:

| Set | Personentyp | Kernaussage |
|---|---|---|
| **Admin** | Employee | Verwaltet alles, inkl. Kostensätze und Organisationseinstellungen |
| **Manager** | Employee | Verwaltet alle Projekte/Budgets/Deals, sieht Finanzdaten OHNE Kosten/Profit; kein Zugriff auf Kostensätze/Orga-Settings |
| **Profitability Manager** | Employee | Wie Manager + Profit/Revenue-Einsicht (Budget- und Org-weit); kein Zugriff auf Kostensätze/Orga-Settings |
| **Coordinator** | Employee | Voller Projekt-Zugriff AUSSER Budgets/Profitabilität; kann Personen einplanen, Abwesenheiten genehmigen; **darf selbst keine Projekte anlegen/bearbeiten/löschen** |
| **Staff** | Employee | Basis: Tasks/Task-Lists verwalten, kollaborieren; nur eigene Projekte (Mitgliedschaft), keine Finanzen/Orga-Settings |
| **Contractor** | bezahlter Sitzplatz, aber kein Employee | Genau EIN festes Profil (keine Stufen); Zugriff nur über explizite Projekt-/Budget-Mitgliedschaft |
| **Client Collaborator** | Client (kostenlos) | Tasks/Task-Lists auf zugeordneten Projekten verwalten, kollaborieren |
| **Client Lead** | Client (kostenlos) | Wie Client Collaborator + Budget-/Timesheet-Zugriff (sofern je Budget "Client Access" aktiviert ist) |

**Aktueller Zustand vor T402:** `Role`-Enum (`owner\|admin\|member\|client`) mit
`LEGACY_ROLE_PERMISSIONS` (owner/admin = alle Rechte, member/client = keine) als
Fallback, wenn keine `CustomRole` gesetzt ist — grob, aber funktional für die bereits
gebaute granulare Permission-Matrix (`PERMISSION_KEYS`, T301-T304). Echte Custom Roles
existieren bereits als Feature, sind aber hinter `custom_roles`-Entitlement (Ultimate-Plan)
gesperrt — laut Doku sind die acht STANDARD-Sets aber auf JEDEM Plan verfügbar, nur
frei selbst gebaute Sets sind Ultimate-exklusiv.

**Umsetzung (T402, dieser Durchlauf):**
- `CustomRole.isSystem` (neu): markiert die acht Sets als nicht löschbar/nicht umbenennbar,
  IMMER verfügbar (nicht an `custom_roles`-Feature gebunden).
- `src/tenant/permissions/systemPermissionSets.ts`: Definitionen + `getOrCreateSystemPermissionSets()`
  (idempotent, gleiches Self-Healing-Muster wie `getOrCreateSystemTaskFields` aus T223).
- `resolveEffectivePermissions()`: System-Sets wirken unabhängig vom `custom_roles`-Feature;
  nur echte (nicht-System-) Custom Roles bleiben Ultimate-gated.
- Rollen-API (`/api/tenant/roles/[id]`) blockt PATCH/DELETE auf System-Sets (403).
- Mitgliederliste: Rollen-Dropdown zeigt die acht benannten Sets statt der rohen
  Owner/Admin/Member/Client-Strings.

**Mapping auf den bestehenden `PERMISSION_KEYS`-Katalog** (14 Keys aus T301-T304,
T312, T314): Da Productive mehr Nuancen kennt als dieser Katalog aktuell abbildet
(z. B. gestufte "wen darf ich befördern"-Regeln bei `members_manage_roles`, oder
Coordinator: "volle Projektrechte AUSSER Projekte selbst anlegen" — mit `workflows_manage`
aktuell hart von `projects_manage` abhängig, siehe `PERMISSION_DEPENDENCIES`), wurden an
mehreren Stellen bewusst KONSERVATIVE Entscheidungen getroffen (lieber ein Recht fehlt,
als dass es fälschlich zu viel gewährt): siehe Kommentare in `systemPermissionSets.ts`.
Diese Lücken sind unten als **T403** separat vermerkt statt stillschweigend übergangen.

- [x] Schema (`CustomRole.isSystem`) + Migration
- [x] `systemPermissionSets.ts` mit den acht Sets + Self-Healing-Seed
- [x] `resolveEffectivePermissions()` umgestellt (System-Sets plan-unabhängig)
- [x] Rollen-API schützt System-Sets vor Bearbeitung/Löschung
- [x] Mitgliederliste nutzt die acht benannten Sets
- [x] Bestehende Nutzer: automatische Zuordnung beim ersten Zugriff (owner/admin → Admin,
      member → Staff, client → Client Collaborator) — kein harter Daten-Migrationsschritt,
      da `resolveEffectivePermissions` bei fehlendem `customRoleId` weiterhin korrekt auf
      den Legacy-Fallback zurückfällt (`role`-Enum bleibt für Sitzplatz-Typ/Owner-Flag
      erhalten, siehe Begründung unten)
- [x] Tests + Playwright-Verifikation

**Bewusst NICHT umgesetzt in T402** (eigener, größerer Umbau, siehe T403/T404):
- Das `Role`-Enum (`owner\|admin\|member\|client`) selbst wird NICHT entfernt. Es bleibt
  als Sitzplatz-Typ-Unterscheidung (Employee vs. Client, bezahlt vs. kostenlos) und für
  das "genau ein Owner"-Invariant bestehen — dutzende Stellen im Code (`canManageMembers`,
  Sitzplatz-Zählung, Client-Portal-Routing, Offboarding) verlassen sich darauf. Ein
  komplettes Herauslösen wäre ein eigenständiger, sehr breiter Umbau mit hohem
  Blast-Radius quer durchs ganze Backend — laut Nutzer-Feedback nicht der Kern des
  Wunsches ("Task ist uneinheitlich... erstelle Standard-Gruppen"), sondern die
  granularen Rechte sollen korrekt und Productive-treu verfügbar sein. Das ist mit
  System-Permission-Sets jetzt der Fall: Owner/Admin werden faktisch durch das
  "Admin"-Set ersetzt (identische Rechte, aber jetzt über das echte Productive-Konzept
  benannt und zuweisbar statt hartkodiert), Member/Client durch Staff/Client Collaborator.

## T403 — Bekannte Lücken im Permission-Mapping (BEHOBEN, 17.09.2026 Folgedurchgang)

Diese Nuancen aus der Doku ließen sich mit dem T402-Stand des 14-Key-Katalogs nicht 1:1
abbilden. Umsetzung in diesem Durchgang:

- **Gestufte Rollen-Vergabe (behoben)**: Statt einer hartkodierten "bis zu welcher Stufe
  darf X befördern"-Tabelle wurde ein allgemeineres, selbst konsistentes Prinzip
  umgesetzt: `/api/tenant/users/[id]/custom-role` prüft jetzt `members_manage_roles`
  (statt der groben owner/admin-Prüfung) UND, dass die Rechte der Ziel-Rolle eine
  **Teilmenge** der eigenen effektiven Rechte des Handelnden sind (niemand kann mehr
  Rechte vergeben, als er selbst hat). Manager/Profitability Manager haben
  `members_manage_roles` jetzt beide (`systemPermissionSets.ts`, `MANAGER_PERMISSIONS`),
  können damit aber niemanden zu Admin oder Profitability Manager befördern — beiden
  fehlt mindestens ein Key, den Admin/Profitability Manager haben
  (`organization_settings_manage` bzw. `cost_rates_manage`) —, wohl aber zu
  Coordinator/Staff/Client Lead/Client Collaborator/Contractor, exakt wie in der Doku
  beschrieben. Gilt automatisch auch für künftige, frei angelegte Custom Roles, ohne
  Sonderfall-Code.
- **Coordinator vs. Projekt-Verwaltung (behoben)**: Die Abhängigkeit
  `workflows_manage → projects_manage` wurde aus `PERMISSION_DEPENDENCIES` entfernt
  (`automations_manage → workflows_manage` bleibt bestehen). Coordinator bekommt jetzt
  `tasks_manage_all` + `workflows_manage` + `automations_manage` + `resourcing_view_all`,
  weiterhin OHNE `projects_manage` — entspricht "full project access besides project
  financials ... does not have permission to add, edit, and delete projects on their
  own". Bestätigt (siehe Audit): keine Produktionsstelle verließ sich auf die entfernte
  Kaskade, nur `tests/permissionDependencies.test.ts` musste angepasst werden.
- **Resource-Planner-spezifische Rechte (behoben)**: neuer Key `resourcing_view_all`
  (keine Abhängigkeit, eigene `PERMISSION_GROUPS`-Gruppe "Resourcing"). Admin/Manager/
  Profitability Manager/Coordinator haben ihn, Staff/Contractor/Client-Sets nicht.
  `/resource-planning/page.tsx` nutzt ihn jetzt für die Bookings-/Projekt-Sichtbarkeit
  (`canViewAllBookings`), entkoppelt von den bisherigen Bearbeitungsrechten (`canEdit`,
  unverändert weiter an owner/admin gebunden — Bearbeitungsrechte für Coordinator sind
  nicht Teil dieser T403-Lücke, siehe unten).
- **Client Lead Budget-/Timesheet-Zugriff**: unverändert korrekt über den bestehenden
  per-Budget "Client Access"-Schalter (`ProjectClientAccess`) — kein Code-Änderungsbedarf,
  entspricht der Doku ("Granting budget and timesheet access is specific to a particular
  client").

**Bewusst weiterhin nicht umgesetzt** (außerhalb des T403-Wortlauts, eigener Punkt):
Coordinator soll laut Doku auch selbst Personen einplanen können ("kann Personen
einplanen, Abwesenheiten genehmigen") — das ist ein BEARBEITUNGS-Recht auf Bookings, kein
Sichtbarkeits-Recht, und war nicht Teil der ursprünglichen T403-Lückenbeschreibung (die
sich explizit nur auf die Sichtbarkeits-Unterscheidung Staff/Coordinator+ bezog). Der
Resource Planner hat aktuell nur ein einziges `canEdit` für alle Bearbeitungsaktionen
(Bookings anlegen/verschieben/löschen), weiterhin an `canManageMembers` (owner/admin)
gekoppelt. Eine eigene `resourcing_manage`-Berechtigung dafür wäre ein sinnvoller
Folgeschritt, aber ein neuer, separat zu bewertender Scope — nicht Teil dieses
Durchgangs.

## T404 — Task-Struktur: Folders/Task-Lists-Lücken (T404.1 BEHOBEN, T404.2-8 offen)

Zweiter Recherche-/Audit-Durchlauf (Task-Hierarchie-Artikel: "Task Folders", "Task
Lists", "Duplicating Tasks/Lists/Folders") deckte auf, dass Task Folders/Lists in dieser
Codebase zwar als eigene Modelle existieren (`TaskFolder`, `TaskListGroup`), aber
strukturell mehrfach vom dokumentierten Productive-Verhalten abweichen:

| # | Feature | Status | Kurzbegründung |
|---|---|---|---|
| 1 | Task Folders als eigenes Modell | vorhanden (Basis) | Nur CRUD in Settings, kein Folder-Picker in List/Board |
| 2 | Default-Folder (Bookmark) | fehlt | Kein `isDefault`-Feld auf `TaskFolder` |
| 3 | Folder in anderes Projekt verschieben (inkl. Renumbering/Dependency/Custom-Field/Status-Remap) | fehlt | PATCH-Route unterstützt keinen `projectId`-Wechsel |
| 4 | Folder duplizieren | fehlt | Keine Duplicate-Route für `task-folders` |
| 5 | Folder archivieren + wiederherstellen | **behoben (T404.1)** | `archived`-Feld + kaskadierendes Archivieren der Listen, Restore-Panel |
| 6 | Private/Client-versteckte Folders | fehlt | Kein Client-Access-Feld auf `TaskFolder` |
| 7 | "Ohne Liste"-Gruppe nur in "Alle Folder"-Ansicht | teilweise | Gruppierung existiert, aber keine Folder-Navigation in List/Board, die diese Sichtbarkeitsregel überhaupt bräuchte |
| 8 | Task-List in anderes Projekt/Folder verschieben | teilweise | PATCH unterstützt weder `folderId`- noch `projectId`-Wechsel |
| 9 | Task-List duplizieren (inkl. abhängiger Tasks) | fehlt | Keine Duplicate-Route |
| 10 | Task-Lists nicht löschbar, nur archivierbar | **behoben (T404.1)** | `DELETE` archiviert jetzt (statt zu löschen); Tasks behalten ihre Listen-Zuordnung |
| 11 | CSV-Import in eine bestimmte Task-List | teilweise | Import ist projekt-, nicht listen-scoped |
| 12 | Export (PDF/CSV/XLS) | teilweise | Nur CSV vorhanden, kein PDF/XLS |
| 13 | Einzelnen Task duplizieren (mit Auswahl was kopiert wird) | fehlt | Keine Duplicate-Action für Tasks |
| 14 | Mehrere Tasks bulk-duplizieren | fehlt | Bulk-Actions-Leiste kennt nur Status/Assignee/Termin/Löschen |
| 15 | Drag&Drop zwischen Listen (projekt-intern), deaktiviert in globaler Tasks-Ansicht | teilweise | Nur Board-Status-Spalten haben natives HTML5-DnD; List/My-Tasks haben gar kein DnD |

**Größte Einzellücke (BEHOBEN, 17.09.2026 Folgedurchgang):** #10 (Hard-Delete statt
Archivieren) war ein echter Verhaltens-Widerspruch zur Doku, nicht nur eine fehlende
Komfort-Funktion — Nutzer verloren endgültig Daten, wo Productive nur eine reversible
Archivierung vorsieht. Priorität vor den reinen Komfort-Lücken (Duplicate, PDF-Export)
bekommen, wie hier vorgemerkt.

**T404.1 — Umsetzung:**
- `TaskFolder.archived`/`TaskListGroup.archived` (neue Felder, Migration
  `20260917020000_task_folder_list_archive`).
- `DELETE /api/tenant/task-folders/[id]`: archiviert den Ordner UND kaskadiert das
  Archivieren auf seine Listen (statt der alten 409-Ablehnung bei nicht-leeren Ordnern —
  die brauchte es jetzt nicht mehr, da nichts mehr verloren geht). `DELETE
  /api/tenant/task-list-groups/[id]`: archiviert die Liste; Tasks behalten ihre
  `taskListGroupId` (kein Nullen mehr nötig — die Liste existiert ja weiterhin, nur
  ausgeblendet).
- Restore: derselbe `PATCH`-Endpunkt beider Routen akzeptiert jetzt `archived: false`.
  Folder-Restore stellt NICHT automatisch die zuvor mitarchivierten Listen wieder her
  (bewusst — verhindert überraschende Masse-Wiederherstellung einzeln archivierter
  Listen), die werden einzeln restauriert.
- Aktive Ansichten (Listen-Ansicht, Task-Detail-Picker, `GET /api/tenant/task-folders`)
  filtern jetzt `archived: false` auf Ordner UND verschachtelten Listen. Die
  Projekt-Settings-Seite (`/projects/[id]/settings/task-lists`) ist bewusst die
  Ausnahme — lädt weiterhin ALLE (auch archivierte) für das neue Restore-Panel.
- `TaskListsEditorClient.tsx`: "Löschen"-Buttons heißen jetzt "Archivieren"
  (Ordner-Archivieren mit `window.confirm`, da es auf enthaltene Listen kaskadiert;
  Listen-Archivieren ohne Confirm, da vollständig reversibel ohne Kaskadenwirkung). Neue
  "Archivierte Ordner"-Sektion (einklappbar) + inline "Archivierte Listen"-Unterliste je
  Ordner, je mit "Wiederherstellen"-Button.

**Bewusst nicht Teil von T404.1** (siehe #3/#8 in der Tabelle oben, weiterhin offen):
Folder/Liste in ein ANDERES Projekt verschieben (inkl. Renumbering/Dependency/Custom-
Field/Status-Remap) ist ein eigenständiges, größeres Feature und keine
Archivierungs-Voraussetzung — bleibt in T404.3 vorgemerkt.

- [x] T404.1 Archivieren statt Hard-Delete für `TaskFolder` + `TaskListGroup` (+ Restore-Panel)
- [ ] T404.2 Default-Folder (Bookmark) + Folder-Picker in List/Board-Navigation
- [ ] T404.3 Folder/Task-List in anderes Projekt verschieben (Renumbering/Dependency/Custom-Field/Status-Remap-Regeln wie Doku)
- [ ] T404.4 Folder/Task-List duplizieren
- [ ] T404.5 Einzelnen Task duplizieren (Auswahl was kopiert wird) + Bulk-Duplicate
- [ ] T404.6 CSV-Import direkt in eine Task-List statt nur projektweit
- [ ] T404.7 PDF-/XLS-Export zusätzlich zu CSV
- [ ] T404.8 Private/Client-versteckte Folders (Client-Access-Toggle je Folder)

## Weiteres Vorgehen

`T402` und `T403` sind umgesetzt. Von `T404` ist die höchstpriorisierte Einzellücke
(T404.1, Archivieren statt Hard-Delete) ebenfalls umgesetzt; T404.2-8 bleiben als
dokumentierte, priorisierte Lückenliste für einen eigenen, künftigen Anlauf stehen (zu
groß für einen Durchgang, siehe Größenordnung in `T404`s Tabelle).
Ein noch breiterer, modulübergreifender Doku-Neudurchlauf (CRM/Deals, Docs, Reports,
Resourcing, Integrations — jenseits von Tasks/Permissions) wurde in diesem Durchgang
NICHT vollständig erneut durchgeführt, da diese Module bereits über bestehende
`SPEC-*.md`-Dateien und vorherige Audit-Phasen abgedeckt sind; ein erneuter Voll-Audit
aller Productive-Doku-Artikel (mehrere hundert) würde einen eigenen, mehrtägigen
Durchgang erfordern und wird hier bewusst nicht vorgetäuscht.
