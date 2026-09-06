# Capability Map: PM-Tool v0.1

Basierend auf Recherche zu Productive.io, OpenProject, Asana, ClickUp, Monday.com, Basecamp, Jira, Wrike, Smartsheet, Notion, Teamwork, Linear. Tech-Stack: Next.js + PostgreSQL + Prisma. Chat/Messaging bewusst nicht in v1.

## Leitprinzip: "klarer" heißt opinionated, nicht konfigurierbar
Die Recherche zeigt einen klaren Gegensatz: Jira/Wrike/Smartsheet sind mächtig, aber unübersichtlich, weil alles konfigurierbar ist, bevor man loslegen kann. **Linear** ist der Referenzpunkt für "besser und klarer" — durch bewusst *weniger* Konfiguration, sinnvolle Standardwerte ab dem ersten Tag, hohe gefühlte Geschwindigkeit (optimistisches UI) und eine Command-Palette (Cmd+K) als primäre Navigation statt Mausklick-Menüs. Dieses Prinzip gilt projektübergreifend für alle v1-Module, nicht nur für `projects-tasks`.

## Architektur-Entscheidung: Datenbank-pro-Tenant, gemeinsame App-Server
- **Zwei-Ebenen-Modell:**
  - **Platform-Ebene** (eine zentrale DB): Tenant-Register (Name, Subdomain, DB-Verbindung, Plan/Status), Platform-Admins, Provisionierungs-Historie
  - **Tenant-Ebene** (eine eigene DB pro Tenant): alles Fachliche — Users, Teams, Projekte, Tasks, Zeiterfassung etc. Die DB-Grenze IST die Org-Grenze, daher **kein** `organization_id`-Spalten-Pattern nötig innerhalb einer Tenant-DB (anders als ursprünglich angedacht)
- **Compute bleibt geteilt:** eine (horizontal skalierbare) Next.js-Anwendung bedient alle Tenants; pro Request wird anhand der Subdomain der Tenant aufgelöst und die passende DB-Verbindung gewählt (dynamischer Prisma-Client / Connection-Pooling, z.B. via PgBouncer)
- **v1 startet einheitlich** (alle Tenants: eigene DB, gemeinsamer DB-Server, gemeinsame App). Gestufte/dedizierte Infrastruktur für Enterprise-Tenants ist explizit **v2+**
- **Infrastruktur-Empfehlung (offen, von mir vorgeschlagen):** Self-hosted auf einem VPS (z.B. Hetzner Cloud) mit Docker Compose: ein Postgres-Server-Container (viele Datenbanken drauf), ein Next.js-App-Container, ein Reverse-Proxy (Traefik/Caddy) für automatisches Subdomain-Routing + TLS. Cloud-agnostisch gehalten, damit später ein Wechsel zu AWS/GCP/Hetzner-Managed-DB möglich ist, ohne die Anwendungsarchitektur zu ändern

## v0.1-Kernmodule (Build-Reihenfolge)

| Module id | Verantwortlichkeit | Abhängig von |
|---|---|---|
| `tenant-provisioning` | Control-Plane: Tenants (Kunden) anlegen, pro Tenant eine neue Postgres-Datenbank provisionieren + Schema-Migration ausführen, Tenant-Register (Subdomain, Status, Plan) pflegen | — |
| `identity-org` | Innerhalb einer Tenant-DB: Users, Teams, Rollen/Rechte, Invites, Auth (Login/Signup/Session) | `tenant-provisioning` |
| `projects-tasks` | Projekte, Tasks/Subtasks, Status-Workflows, Task-Abhängigkeiten, Custom Fields, Ansichten (eine Datenquelle, mehrere Lenses: Liste/Board/Kalender/Gantt), **Triage-Inbox** (neue Tasks erst sichten, bevor sie ins Backlog wandern), **Command-Palette (Cmd+K)** als primäre Navigation | `identity-org` |
| `time-tracking` | Timer + manuelle Zeiteinträge, verknüpft mit Tasks/Projekten | `projects-tasks` |
| `budgeting-basic` | Einfache Budget-Zahlen pro Projekt (Stunden/Betrag), Soll-/Ist-Vergleich — **keine** Rechnungsstellung/Rate-Cards (siehe v2) | `time-tracking` |
| `resource-planning-basic` | Auslastungs-/Kapazitätsansicht pro Person über Projekte hinweg | `projects-tasks`, `time-tracking` |
| `reporting-dashboards` | Vordefinierte Reports (überfällig, Fortschritt) + einfache anpassbare Dashboard-Widgets | `projects-tasks`, `time-tracking`, `budgeting-basic` |
| `collaboration` | Kommentare, @Mentions, Datei-Anhänge, projektgebundene Docs/Wiki-Seiten | `projects-tasks` |
| `notifications` | Aktivitäts-Feed + granulare Benachrichtigungs-Einstellungen (pro Projekt: alles/nur Mentions/aus), Broadcast-Mentions (@channel-Äquivalent pro Projekt) | `projects-tasks`, `collaboration` |
| `admin-settings` | Innerhalb einer Tenant-DB: Org-Einstellungen, Mitgliederverwaltung, Rollen-Konfiguration | `identity-org` |

Build order: `tenant-provisioning` → `identity-org` → `projects-tasks` → (`time-tracking`, `collaboration`) → (`budgeting-basic`, `resource-planning-basic`, `notifications`) → `reporting-dashboards` → `admin-settings`

## v0.1-Extras (bereits vom Menschen ausgewählt)
- `webhooks` — Ausgehende Webhooks bei Events (Task erstellt/erledigt etc.)
- `hill-charts` — Basecamp-Konzept: qualitativer Fortschritt (bergauf/bergab) statt nur %-Fertig
- `automatic-check-ins` — Wiederkehrende, automatisch gestellte Status-Fragen, Antworten landen als Log

## Spätere Versionen (bewusst nicht in v0.1)

| Module id | Warum später |
|---|---|
| `tiered-tenant-infra` | Gestufte/dedizierte Infrastruktur für Enterprise-Tenants (eigener DB-Server/eigene Compute-Ressourcen) |
| `chat-messaging` | Explizit vom Menschen auf später verschoben (Echtzeit/WebSockets/Presence) |
| `invoicing-profitability` | Rate Cards, Rechnungen aus Zeiterfassung, Margen-Reporting — hoher Aufwand, baut auf `budgeting-basic` auf |
| `automation-rules` | No-Code Trigger→Aktion-Engine |
| `cross-board-relations` | Monday-artige Mirror/Connect-Spalten zwischen Projekten |
| `sso-scim` | Enterprise-Auth (SSO/SCIM/2FA-Erzwingung) |
| `integrations-marketplace` | Öffentliche API/App-Marktplatz über die Basis-Webhooks hinaus |
| `search-modifiers` | Natürlichsprachige Suche mit "Advanced"-Toggle zu roher Query-Syntax (JQL-lite, ohne Jiras Lernkurve) |
| `cross-tagging` | Ein Task in mehreren Projekten gleichzeitig sichtbar/bearbeitbar (Wrike) — grundlegende Datenmodell-Entscheidung, siehe Entscheidungspunkt unten |
| `cycles-sprints` + `cycle-insights` | Linear-Style Sprints mit automatischer Velocity/Scope-Creep-Auswertung |
| `client-portal` | Teamwork-Style gebrandete Kundenportale mit eingeschränkter Sicht |
| `dynamic-shared-views` | Smartsheet-Style: leichte, berechtigungsbeschränkte externe Ansicht ohne vollen Zugang |
| `retainer-tracking` | Wiederkehrende Budget-Pools mit Live-Burn-Anzeige — baut auf `invoicing-profitability` auf |
| `slack-to-issue-capture` | Externe Nachricht → strukturierter Task (Linear "Asks") — braucht Integrations-Schicht |
| `workflow-transition-rules` | Jira-Style: Bedingungen/Pflichtfelder pro Status-Übergang |
| `whiteboards`, `portfolios-goals`, `baseline-diffing` | Fortgeschrittene/teure Einzelfeatures |

## Entscheidungen (mit dem Menschen abgestimmt)
- **Cross-Tagging:** Task↔Projekt ist von Anfang an many-to-many im Datenmodell (Wrike-Style), auch wenn die v1-UI nur eine "primäre" Projekt-Zuordnung + optionale weitere Verknüpfungen zeigt
- **Triage-Inbox + Command-Palette (Cmd+K):** beide sind Kern-Bestandteil von `projects-tasks` in v1, nicht optional
- **Map final freigegeben** — Start der Modul-Specs in Build-Reihenfolge

## Recherche-Status
Beide Runden abgeschlossen (12 Produkte). Ergebnis ist vollständig in diese Map eingeflossen.

## Status
- [x] `tenant-provisioning` — implementiert (Docker Compose, Prisma-Doppelschema, sichere DB-Provisionierung, Subdomain-Routing über `proxy.ts`, Admin-UI)
- [x] `identity-org` — implementiert (User/Session/Invite/Team-Modelle, bcryptjs, Cookie-Sessions, Owner-Invite bei Provisionierung, Login/Logout, Mitgliederverwaltung mit Rollen-Schutzlogik)
- [x] `projects-tasks` — implementiert (konfigurierbare Workflows, Tasks mit Cross-Tagging/Abhängigkeiten/Custom Fields, Triage/Liste/Board/Kalender/Gantt, Cmd+K). Gantt-Drag-UX und Cmd+K-Tastenkombination mangels Browser-Zugriff nicht selbst visuell getestet
- [x] `time-tracking` — implementiert (Timer mit Auto-Stop, manuelle Einträge, optionale Projektebene-Buchung per Tenant-Einstellung, Aggregation)
- [x] `collaboration` — implementiert (Kommentare mit @Mention-Erkennung, Datei-Anhänge über lokale Disk mit UUID-Pfaden, Wiki-Seiten mit Markdown-Rendering + XSS-Sanitizing via `isomorphic-dompurify`)
- [x] `budgeting-basic` — implementiert (Soll-/Ist-Stunden und -Betrag pro Projekt, flacher Stundensatz, Rollen-Schutz für Bearbeitung, Ist-Aggregation über direkte + primär-task-gebundene Zeiteinträge)
- [x] `resource-planning-basic` — implementiert (Wochen-Auslastungsansicht pro Person cross-projekt, basierend auf `estimatedHours` zugewiesener Tasks mit Fälligkeit in der laufenden Woche vs. `weeklyCapacityHours`; Kapazitäts-Bearbeitung nur owner/admin)
- [x] `notifications` — implementiert (Aktivitäts-Feed pro Projekt, persönliches Postfach mit pro-Projekt-Präferenzen all/mentions/off, `@channel`-Broadcast-Mentions, die `off` respektieren)
- [x] `reporting-dashboards` — implementiert (Reports für überfällige Tasks und Projekt-Fortschritt, persönliches Dashboard mit festem Widget-Katalog, an/aus + Reihenfolge pro Nutzer)
- [x] `admin-settings` — implementiert (Org-Währungseinstellung, Mitglieder-Deaktivierung/-Reaktivierung mit Login-Sperre und Schutz des letzten aktiven Owners, Settings-Hub; Rollen-Verwaltung bereits durch bestehende `/members`-Seite abgedeckt)
- [x] `webhooks` — implementiert (konfigurierbare Endpunkte pro ActivityEventType, HMAC-signierte Zustellung, synchroner Retry mit Backoff `[0,1,3]`s, Delivery-Log; angebunden über den bestehenden `recordActivity()`-Integrationspunkt aus `notifications`)
- [x] `hill-charts` — implementiert (Hill-Position pro Task, SVG-Hügelkurve pro Projekt mit Drag analog zum Gantt, done/Triage-Tasks ausgeschlossen). Drag-Feel mangels Browser-Zugriff nicht selbst visuell getestet, nur die Persistenz via curl
- [x] `automatic-check-ins` — implementiert (projekt-gebundene, wiederkehrende Status-Fragen mit daily/weekly-Periodenlogik, Pull-basiert statt echtem Cron, Upsert verhindert Doppel-Antworten pro Periode, Log für alle Antworten)
## Capability Map: v0.2

Feature-Bundle vom Menschen angefordert (Projekt-Navigation, Budgets pro
Projekt mit Sections/Services, zwei Zeiterfassungs-Modi, Abwesenheiten,
Firmen-Zeitübersicht, Settings-Restrukturierung), plus ein direkt danach
angefordertes Redesign (Apple-HIG-Look app-weit) und zwei Nachzügler-Features
(Tenant-Löschung im Platform-Admin, Nav-Dropdowns + Profilbilder).

| Module id | Verantwortlichkeit | Abhängig von |
|---|---|---|
| `projects-nav-v2` | Aufteilung "Meine Tasks"/"Projekte" in der Navigation, Task-Anlage direkt im Projekt, Tenant-weiter Triage-Ein/Aus-Schalter | `projects-tasks` |
| `budgeting-v2` | Mehrere Budgets pro Projekt, Sections/Services mit Personen-Zuordnung, Menge/Preis/Ist/Rest/Nutzung% | `budgeting-basic` |
| `time-tracking-v2` | Tenant-weite Wahl zwischen Zeituhr und Zeiteintragungen; Zeiteintragungen sind an eine Budget-Section (inkl. Stundensatz) gebunden und erhöhen `budgetUsed` transaktional | `budgeting-v2`, `time-tracking` |
| `absence-management` | Urlaub/Krankheit beantragen, Admin-Genehmigung, genehmigte Werktage zählen als Soll-Stunden erfüllt | `identity-org` |
| `company-time-overview` | Wochenübersicht gebuchter Stunden je Mitglied für Admins, Tages-Drilldown im Zeiteintragungs-Modus | `time-tracking-v2`, `absence-management` |
| `settings-restructure` | Settings-Hub in My Settings/Organization/Users gruppiert; die meisten Unterpunkte sind v0.2 bewusst Platzhalter | `admin-settings` |
| `apple-design-migration` | Design-System app-weit auf Apple-HIG-Optik umgestellt (Farb-/Radius-/Schatten-Tokens, Top-Nav statt Sidebar) | — |
| `tenant-deletion` | Tenant im Platform-Admin löschen (DB droppen, Registry-Eintrag entfernen) | `tenant-provisioning` |
| `nav-dropdowns-profile` | Top-Nav zu Dropdowns verdichtet (Projekte-Hover-Menü, Konto-Dropdown hinter Avatar), Profilbild-Upload/Presets | `apple-design-migration` |

Build order: `projects-nav-v2` → `budgeting-v2` → `time-tracking-v2` → `absence-management` → `company-time-overview` → `settings-restructure` → (`apple-design-migration` → `tenant-deletion` → `nav-dropdowns-profile`, unabhängig von den fachlichen Modulen oben)

### Status
- [x] `projects-nav-v2` — implementiert, Docker-verifiziert
- [x] `budgeting-v2` — implementiert, Docker-verifiziert
- [x] `time-tracking-v2` — implementiert, Docker-verifiziert
- [x] `absence-management` — implementiert, Docker-verifiziert
- [x] `company-time-overview` — implementiert, Docker-verifiziert
- [x] `settings-restructure` — implementiert; **acht Unterseiten sind bewusste Platzhalter** (siehe unten)
- [x] `apple-design-migration` — implementiert, Docker-verifiziert
- [x] `tenant-deletion` — implementiert, Docker-verifiziert
- [x] `nav-dropdowns-profile` — implementiert, Docker-verifiziert (inkl. Bugfix: Dropdown wurde durch `overflow-x` auf dem Nav-Container geclippt)

### Offene Platzhalter aus `settings-restructure`
Diese acht Seiten zeigen aktuell nur einen Hinweistext ohne echte Funktion.
Keine ist Teil eines bestehenden Moduls — jede wäre ein eigenständiges
Mini-Capability, falls gewünscht:

| Seite | Würde bedeuten |
|---|---|
| My Settings → Notifications | UI für das bereits bestehende `NotificationPreference`-Modell (aktuell nur API, keine Einstellungsseite) |
| My Settings → Security | Passwort ändern, aktive Sessions einsehen/beenden |
| My Settings → Appearance | Theme-Auswahl (aktuell nur System-Dark-Mode via `prefers-color-scheme`) |
| Organization → Service types | Eigenes Datenmodell für benannte Leistungstypen (aktuell sind Budget-Section-Namen Freitext) |
| Organization → Recycle bin | Soft-Delete + Wiederherstellung (aktuell werden z. B. Tasks hart gelöscht) |
| Organization → Workflows | UI zum Bearbeiten der Workflow-Status-Gruppen (Status-Modell existiert bereits pro Projekt, aber keine Verwaltungsseite) |
| Organization → Automations | No-Code Trigger→Aktion-Engine — deckungsgleich mit `automation-rules` aus den "Späteren Versionen" |
| Users → Employee fields | Konfigurierbare Personaldaten-Felder pro Tenant |

## Capability Map: v0.2 ("Spätere Versionen" — Build-Reihenfolge freigegeben)

Mit dem Menschen abgestimmte Reihenfolge für die v0.1-"Spätere Versionen"-Liste.
`cross-tagging` ist bereits in v0.1 umgesetzt (many-to-many Task↔Projekt im
Datenmodell) und entfällt daher hier. Jedes Modul durchläuft
Specify → Plan → Tasks → Implement einzeln, in dieser Reihenfolge:

1. `automation-rules` — füllt zugleich den Settings-Platzhalter "Automations"
2. `workflow-transition-rules`
3. `invoicing-profitability`
4. `cycles-sprints` + `cycle-insights`
5. `retainer-tracking` — baut auf `invoicing-profitability` auf
6. `client-portal`
7. `dynamic-shared-views`
8. `cross-board-relations`
9. `search-modifiers`
10. `sso-scim`
11. `integrations-marketplace`
12. `chat-messaging`
13. `tiered-tenant-infra`
14. `slack-to-issue-capture`
15. `whiteboards`, `portfolios-goals`, `baseline-diffing`

**Map final freigegeben** — Start mit `automation-rules`.

### Status
- [x] `automation-rules` — implementiert, Docker-verifiziert (füllt zugleich den Settings-Platzhalter "Automations")
- [x] `workflow-transition-rules` — implementiert, Docker-verifiziert
- [x] `invoicing-profitability` — implementiert, Docker-verifiziert
- [x] `cycles-sprints` + `cycle-insights` — implementiert, Docker-verifiziert
- [x] `retainer-tracking` — implementiert, Docker-verifiziert
- [x] `client-portal` — implementiert, Docker-verifiziert
- [x] `dynamic-shared-views` — implementiert, Docker-verifiziert
- [x] `cross-board-relations` — implementiert, Docker-verifiziert
- [x] `search-modifiers` — implementiert, API Docker-verifiziert (UI-Toggle mangels Browser-Zugriff nicht visuell testbar)
- [x] `sso-scim` — Scope: 2FA + SCIM implementiert, Docker-verifiziert; SSO (OIDC) bewusst nicht gebaut (braucht echten externen IdP zum Testen)
- [x] `integrations-marketplace` — implementiert, Docker-verifiziert
- [ ] `chat-messaging`
- [x] `tiered-tenant-infra` — Mechanik implementiert, Docker-verifiziert (echte Multi-Server-Trennung nicht testbar, nur 1 Postgres-Container vorhanden)
- [x] `slack-to-issue-capture` — implemented, Docker-verified (2FA-analoge HMAC-Signaturprüfung, echter Slack-Workspace nicht verfügbar — siehe Hinweis in tasks/todo-slack-to-issue-capture.md)
- [x] `portfolios-goals` — implemented, Docker-verified (Fortschritt live aus Task-Abschlussgrad berechnet)
- [x] `baseline-diffing` — implemented, Docker-verified (unveränderliche Snapshots, live berechneter Diff)

**v0.2-Roadmap vollständig abgearbeitet** (15/15 Module, `whiteboards` bewusst gestrichen).
- Gestrichen: `whiteboards` (Nutzerentscheidung — Freihand-Canvas/Echtzeit-Sync in dieser Umgebung nicht sinnvoll umsetzbar/testbar)

## Post-v0.2: Tenant-Lizenzierung

- [x] `tenant-plans-entitlements` — implementiert, Docker-verifiziert. Drei Pläne
  (Klein/Mittelstand/Enterprise) mit unterschiedlichem Feature-Umfang, plus
  optionales 2FA/SCIM-Add-on für Klein. Durchsetzung zentral in `proxy.ts`
  (Nav ausgeblendet + API 403). Tenants sind zusätzlich zum Löschen jetzt auch
  deaktivierbar (Status `disabled`, Daten bleiben erhalten). Details:
  `SPEC-tenant-plans-entitlements.md`, `tasks/todo-tenant-plans-entitlements.md`.
