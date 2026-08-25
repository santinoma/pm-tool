# Capability Map: PM-Tool v1

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

## v1-Kernmodule (Build-Reihenfolge)

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

## v1-Extras (bereits vom Menschen ausgewählt)
- `webhooks` — Ausgehende Webhooks bei Events (Task erstellt/erledigt etc.)
- `hill-charts` — Basecamp-Konzept: qualitativer Fortschritt (bergauf/bergab) statt nur %-Fertig
- `automatic-check-ins` — Wiederkehrende, automatisch gestellte Status-Fragen, Antworten landen als Log

## Spätere Versionen (bewusst nicht in v1)

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
- [ ] `identity-org` — Spec
- [ ] `projects-tasks` — Spec
- [ ] `time-tracking` — Spec
- [ ] `collaboration` — Spec
- [ ] `budgeting-basic` — Spec
- [ ] `resource-planning-basic` — Spec
- [ ] `notifications` — Spec
- [ ] `reporting-dashboards` — Spec
- [ ] `admin-settings` — Spec
- [ ] `webhooks` — Spec
- [ ] `hill-charts` — Spec
- [ ] `automatic-check-ins` — Spec
