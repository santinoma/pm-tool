# Capability Map: Productive.io Parity Roadmap

Erstellt nach einem vollständigen Scan aller 28 Kategorien / ~650 Artikel auf
help.productive.io (7 parallele Recherche-Agenten, je 1-2 Sekunden pro Artikel
gelesen wo strukturell relevant), abgeglichen gegen den tatsächlichen
Codestand von PM·Atlas (inkl. Korrektur: mehrere von den Agenten als
"Missing" gemeldete Features existieren bereits aus früheren, nicht mehr im
Kontext sichtbaren Sessions — siehe `tasks/todo-*.md`, praktisch alle mit
"Checkpoint: Abschluss — ✅ erreicht").

## Bereits stark abgedeckt (keine Aktion nötig)

Diese Domänen sind bereits auf solider Tiefe gebaut — Agenten-Befunde wie
"Missing" wurden hier durch Codeprüfung korrigiert:

- **Absence/Time-Off**: Antrag+Genehmigung, Kategorien, `countBusinessDays`/
  `computeCreditedHours` (`todo-absence-management.md`)
- **Resource Planning (Basic)**: Wochenkapazität cross-Projekt, Drill-down,
  Owner/Admin-Bearbeitung (`todo-resource-planning-basic.md`) — Productive.io
  hat ein deutlich größeres Buchungs-/Scheduling-Grid, das bleibt eine Lücke
  (siehe unten), aber "Missing" war falsch — eine Basis existiert.
- **Reporting Dashboards**: Widget-basiertes Dashboard mit Reihenfolge/
  An-Aus (`todo-reporting-dashboards.md`)
- **Dynamic Shared Views**: öffentliche schreibgeschützte Freigabe-Links mit
  Widerruf (`todo-dynamic-shared-views.md`) — deckt einen Teil der von den
  Agenten als "Views/Filters-Engine fehlt" gemeldeten Lücke ab.
- **Invoicing (Basis)**: Rechnung erstellen, Line-Items, Margen-Report,
  interner Stundensatz (`todo-invoicing-profitability.md`) — aber: kein
  Draft→Finalize-Lifecycle, keine Zahlungsverfolgung, keine Credit Notes
  (siehe unten, das bleibt eine echte Lücke).
- **Webhooks**: HMAC-signierte Zustellung mit Retry (`src/tenant/webhooks/`)
- **Search Modifiers**: `status:`/`assignee:me`/`project:"..."` in der
  Cmd+K-Suche (`todo-search-modifiers.md`)
- **Portfolios & Goals**: `/portfolios`, Goal-Status-Tracking
- Außerdem bereits fertig: Retainer-Tracking, Cross-Board-Relations,
  Hill-Charts, Collaboration/Notifications, Custom Roles/Permissions,
  Client-Portal, Company-Time-Overview, Integrations-Marketplace,
  Workflow-Transition-Rules, Slack-to-Issue-Capture, SCIM-Provisionierung
  + 2FA-Erzwingung (aber **kein** echtes SAML/OIDC-SSO-Login — siehe unten).

## Domäne 1: Projects / Tasks / Views / Docs / Custom Fields (höchste Priorität — Kernprodukt)

| # | Feature | Aufwand | Warum |
|---|---|---|---|
| 1 | **Task Folders → Task Lists** (Ordner→Liste→Task-Hierarchie für Phasen/Meilensteine) | M | am häufigsten referenzierte strukturelle Lücke |
| 2 | **Gespeicherte/teilbare Views** (Layout+Filter+Felder benennen, speichern, teilen) | M | Kern-Primitive hinter Productives ganzer Views-Kategorie; wir haben feste View-*Typen*, aber keine gespeicherten Konfigurationen |
| 3 | Dynamischer "Ich"-Filter auf geteilten Views | S | baut auf #2 auf |
| 4 | Task-Templates (projekt-scoped, selektive Feld-Übernahme) | M | spiegelt bestehendes Projekt-Template-Muster |
| 5 | Bulk-Task-Editing (Mehrfachauswahl → Zuweisen/Status/Datum/Duplizieren) | M | Board/List-Drag-Drop deckt das nicht ab |
| 6 | Private Tasks (nur Assignee+Subscriber sichtbar) | M | erweitert bestehende echte-ACL-Philosophie |
| 7 | Wiederkehrende Tasks | M-L | braucht Scheduler |
| 8 | Task-Dependencies als Pfeile im Gantt sichtbar machen | S-M | Datenmodell existiert, Visualisierung fehlt |
| 9 | Custom Fields auf Docs generalisieren (+ Pflichtfeld/File-Typ/Sortierung) | M | Engine existiert schon für Tasks |
| 10 | Doc-Templates + öffentlicher Read-Only-Link + PDF-Export | M | konkrete Erweiterung des bestehenden Wiki |
| 11 | Key Tasks (Meilenstein-Flag) | S | leichtgewichtig, nützlich für Gantt/Roadmap |

## Domäne 2: Budgets / Invoicing / Reports (zweitwichtigste — Geld)

| # | Feature | Aufwand | Warum |
|---|---|---|---|
| 1 | **Echte Invoice-Lifecycle**: Draft→Finalize, 3 Invoicing-Methoden (Uninvoiced Time/Expenses, Remaining Amount, Percentage), echter Line-Item-Editor | L | größte funktionale Lücke, aktuell nur simpler Status-Enum |
| 2 | **Zahlungsverfolgung** (voll/teilweise, Write-off, Auto-Status) | M | fehlt komplett |
| 3 | Credit Notes | M | Korrektheit für echte Rechnungsstellung |
| 4 | Budget-"Deliver"-Lifecycle (sperrt Zeit/Ausgaben, markiert abrechnungsbereit) | M | fehlt, Vorstufe für sauberes Invoicing |
| 5 | Report-Builder (Datenquelle wählen, filtern, gruppieren, Chart-Typ, speichern) | L | ersetzt 2 fest codierte Report-Seiten |
| 6 | Automatisierte Zeit-Warnschwellen (% Budget verbraucht → E-Mail) | S | ergänzt bestehendes Overrun-Blocking |
| 7 | Wiederkehrende Budgets (Retainer, Rollover) | M | Retainer-Use-Case |
| 8 | Einfacher Steuersatz pro Line-Item (bewusst KEIN Multi-Jurisdiktion) | S | |
| 9 | Budget-Templates (ganzes Budget als Vorlage, nicht nur Rate-Card-Services) | S | |

**Bewusst zurückgestellt**: echte Expenses/Purchase-Orders als Vollentität
(großer Vorlauf-Aufwand, hängt an Invoicing-Kern), Multi-Currency, PDF-
Branding/Document-Style-Editor, Kombinieren mehrerer Budgets in eine Rechnung.

## Domäne 3: Resourcing / Time (drittwichtigste)

| # | Feature | Aufwand | Warum |
|---|---|---|---|
| 1 | Time-Approval-Workflow (Submit→Manager-Freigabe→Lock) | M | natürliche Erweiterung, ermöglicht Abrechnungssicherheit |
| 2 | Timesheet-Locking | S | passt zu #1 |
| 3 | Time-Tracking-Policies (Tages-Cap, keine Überlappung) | M | Datenintegrität |
| 4 | Resource-Planner-Ausbau: echtes Buchungs-Grid statt reiner Wochenkapazitäts-Aggregation, mit Rot/Grün-Kapazitätsanzeige | L | größte Einzellücke in dieser Domäne, Basis existiert bereits |
| 5 | Feiertagskalender (regional, reduziert Kapazität automatisch) | M | Voraussetzung für korrekte Kapazitätsrechnung |
| 6 | Zeit für andere buchen (Admin/PM im Auftrag) | S | |

## Domäne 4: Foundations (Settings/Roles/User-Mgmt/Billing) — niedrigere Priorität, aber günstige Gewinne

| # | Feature | Aufwand |
|---|---|---|
| 1 | Sitzungs-/Geräteverwaltung (aktive Sessions auflisten/widerrufen) | S |
| 2 | Offboarding-Workflow (Deaktivieren + Ownership-Transfer statt Hard-Delete) | M |
| 3 | Audit-Log (org-weites filterbares Änderungsprotokoll) | M |
| 4 | Quick-Add + Favorites | S |
| 5 | Manager-Zuweisung + Org-Chart | S-M |
| 6 | Kaskadierende Permission-Abhängigkeiten | S |
| 7 | Login-Zugriff entziehen (Seat-erhaltend) | S |

## Domäne 5: Automation / Extensibility

| # | Feature | Aufwand |
|---|---|---|
| 1 | **Öffentliche dokumentierte REST-API** für PM·Atlas selbst | L | Grundvoraussetzung für #2, #3, Zapier |
| 2 | Personal-Access-Token-Verwaltung (Read-only/Read-write, Rate-Limit) | M |
| 3 | Bulk-Edit-Action-Tray auf Task-/List-Views | M |
| 4 | CSV-Import (Tasks/Users/Companies/Time-Entries, Vorlage+Validierung+Revert) | M |
| 5 | Generischer Tabellen-Export (CSV/XLS mit aktivem Filter) | S-M |
| 6 | Automation-Engine: Terminierte Bulk-Aktionen über *mehrere* passende Objekte (bisher nur "Run Now" auf 1 Task) | L |
| 7 | Automation-Aktionsbibliothek erweitern (Task/Subtask/Todo erstellen, E-Mail senden) | S |
| 8 | Automation-Scope auf mehrere/alle Projekte | M |

## Domäne 6: Enterprise Auth

| # | Feature | Aufwand |
|---|---|---|
| 1 | **SAML-2.0-SSO** (Google Workspace, Okta, Microsoft Entra), verdrahtet mit bestehendem SCIM | M | einziger bestätigter echter Enterprise-Gap, gut vorbereitet durch SCIM |
| 2 | SSO-Erzwingung (org-weit, Client-Rolle ausgenommen) | S |

## Domäne 7: AI (eine gezielte Empfehlung, kein Suite-Aufbau)

| # | Feature | Aufwand |
|---|---|---|
| 1 | **AI-Task-Zusammenfassung** (1 LLM-Call über Kommentar-/Aktivitätsverlauf eines Tasks) | S-M | einzige empfohlene AI-Funktion — eng begrenzt, kein neues Infra nötig außer einem LLM-API-Key |

**Explizit nicht empfohlen**: AI-Assistant/Agents/Notetaker (brauchen
Tool-Calling-Infra, Meeting-Bot-Pipeline, Such-Index — unverhältnismäßig für
ein kleines Team).

## Domäne 8: CRM/Sales — bewusst NICHT empfohlen

Produktentscheidung aus früherer Session bereits getroffen: "CRM folgt in
späterer Version irgendwann, nicht wichtig jetzt." Alle Deals/Pipeline/
Proposals/Revenue-Distribution-Features aus Productive.io sind vollständig
nicht gebaut und bleiben es — nur 5 kleine, CRM-unabhängige Client-Company-
Verbesserungen sind sinnvoll (Status active/archived, reichhaltigeres
Firmenprofil, Kontakt-Unterentität, Parent/Child-Firmen, Client-gebundener
Aktivitäts-Feed).

## Explizit übersprungen (unverhältnismäßig / Drittanbieter-Abhängigkeit)

Polaris/SQL-BI, Sandbox-Umgebung, Multi-Currency/Fiskaljahr/Month-Closing,
Subsidiaries, i18n/Lokalisierung, Document-Style-Editor (Branding/Fonts),
Notetaker/Meeting-Bot, benannte Drittanbieter-Connectoren (Slack/Xero/
HubSpot direkt — stattdessen: eigene öffentliche API + Zapier-Listing),
monatliche Automation-Kontingente (Business-Modell-Feature).

## Empfohlene Build-Reihenfolge (Vorschlag, zur Bestätigung)

1. Domäne 1 (Projects/Tasks/Views) — Kernprodukt, höchster täglicher Nutzen
2. Domäne 2 (Budgets/Invoicing/Reports) — schließt echte Geld-Lücken
3. Domäne 6 (SAML-SSO) — klein, hoher Enterprise-Hebel, SCIM-Vorarbeit vorhanden
4. Domäne 3 (Resourcing/Time) — Resource-Planner-Ausbau ist groß, Rest ist klein
5. Domäne 5 (Automation/Extensibility) — API+PAT zuerst, alles andere hängt daran
6. Domäne 4 (Foundations) — günstige Einzelgewinne, jederzeit einstreubar
7. Domäne 7 (AI) — 1 gezieltes Feature, unabhängig einschiebbar
8. Domäne 8 (Clients, CRM-unabhängig) — klein, jederzeit einstreubar
