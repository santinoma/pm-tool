# Phase 5 — UX-Pattern-Audit gegen die Productive-Entwickler-Referenz

Nutzer-Auftrag (22.09.2026): "Baue die ganze App auf REACT + Tailwind um + alle
UI-Elemente state-of-the-art bauen. Orientiere dich exakt an dem angehangenen
Dokument [Productive-Entwickler-Referenz, 47 Seiten, asbrucon GmbH]." Mit dem
Zusatz, durchzulaufen bis fertig, auch unbeaufsichtigt.

## Ausgangslage (wichtig, ändert den Auftrag inhaltlich)

Die App läuft **bereits vollständig auf React (Next.js 16) + Tailwind CSS 4 +
shadcn/ui** — siehe `NEXTELITE-MIGRATION-CAPABILITY-MAP.md` (Migration
"vollständig abgeschlossen 2026-08-27", alle 15 Module, V1/V2/V3 komplett
entfernt). Die Farb-/Typografie-/Radius-Tokens sind bereits exakt auf **dieses
Referenzdokument** re-getuned — siehe `DESIGN.md` ("re-tuned to the asbrucon
Productive Entwickler-Referenz"). Ein Komplett-Neubau würde also getestete,
funktionierende Arbeit wegwerfen, ohne dass die Farb-/Typo-Basis das
eigentliche Problem wäre.

**Was tatsächlich fehlt** (per Definition von DESIGN.md: "component layer …
unchanged structurally — only its color/radius/type tokens moved toward the
reference"): die **strukturellen UX-Muster** aus der Referenz — App-Chrome,
universelles Listen-Toolbar-Muster, die zwei Detail-Muster, DataViz-
Komponenten. Diese Phase 5 ist daher ein **gezielter Redline-Audit + Fix**,
kein Rewrite — konsistent mit der Arbeitsweise der vorherigen Phasen in
diesem Repo.

## Methode

4 parallele Explore-Agenten haben je einen Bereich der Referenz (Hub §02–§05)
gegen den tatsächlichen Code geprüft, mit Datei:Zeile-Belegen. Ergebnis unten,
gruppiert nach Referenz-Kapitel. Priorisierung folgt der Referenz selbst
(§08 "Priorisierung für den PoC → Produkt-Weg"): P1 Listen-Muster + App-
Chrome, P1 Detail-Muster, P2 Sichten + DataViz, P3 globale Aktionen/Sidebars.

---

## T501 — App-Chrome (§02 der Referenz)

**Befund:**
- Modul-Nav zeigt die 7 Labels, aber Financials/Resourcing/CRM/Reports/
  Portfolios sind entitlement-gated und verschwinden je nach Plan —
  Business-Entscheidung dieser Codebase (Plan-Gating), kein Bug; bewusst NICHT
  angefasst.
- Mega-Menü mit Sub-Bereichen + Recents existiert bereits (`NavGroupDropdown`).
- Email Inbox ist ein `disabled`-Stub ("coming soon").
- Approvals ist Manager-only ausgeblendet — nicht in der Doku beschrieben,
  aber sinnvolle Rechte-Entscheidung; nicht angefasst.
- **Favorites sitzt als Topbar-Dropdown statt als rechte Sidebar** —
  Referenz zählt es explizit zu den drei rechten Overlay-Sidebars.
- **Kein globaler Kontext-Balken** ("Company/Entity · Object title" +
  Stern/Auge/⋯) — jede Seite baut sich ihren eigenen, inkonsistenten
  Breadcrumb.
- **Gespeicherte Sichten sind Buttons, keine Tabs**, kein "+N more"-Overflow.
- **Keine AI-Assistant-Sidebar** — keine Spur im Code.
- **Notifications ist eine volle Route, kein Overlay-Panel.**

**Umsetzung (dieser Durchgang):**
- [x] T501.1 Favorites von Topbar-Dropdown zu rechter Sidebar (Sheet-Overlay,
      `side="right"`, Projekt-/Listen-Kontext bleibt sichtbar dahinter)
- [x] T501.2 Notifications: neuer Bell-Button mit ungelesen-Indikator öffnet
      dasselbe Sidebar-Overlay-Muster (client-seitig via `GET
      /api/tenant/notifications`, bereits vorhandene aber bis dahin ungenutzte
      Route), mit "Alle anzeigen" → `/notifications` als Fallback/Deep-Link
      (Route bleibt unverändert bestehen)
- [x] T501.3 `SavedViewsBar` intern umgebaut: unterstrichene Tab-Reihe
      (aktive Sicht farblich hervorgehoben) statt loser Buttons, "+N more"-
      Overflow-Popover ab 5 Sichten (Komponentenname/API unverändert, nur die
      Darstellung — kaskadiert automatisch auf alle drei Aufrufer: Tasks-
      Liste, My-Tasks, Budgets-Liste) — Playwright-verifiziert mit 7 Sichten
      (5 inline + "+2 more")
- [ ] T501.4 Globaler Kontext-Balken (Company/Entity · Objekt-Titel · Stern/Auge/⋯) — zurückgestellt, siehe T503
- [ ] T501.5 AI-Assistant-Sidebar — eigenständiges KI-Feature, kein Redesign-Scope; siehe "Bewusst zurückgestellt" unten

## T502 — Universelles Listen-Muster (§03 der Referenz, "größter UX-Hebel")

**Befund:** Kein gemeinsames `ListToolbar`-Bauteil — jede Liste baut sich
eine andere Teilmenge zusammen (Tasks-List: 8 Controls über 2 Zeilen,
My-Tasks: Segment-Switch + 3 Controls, Budgets: 3 Controls, Members: 0
Controls, Table-Layout: 0 Controls). Gruppierung nur Status/Liste (keine
Assignee-Gruppierung, kein Avatar, keine Zwischensummen). Inline-Edit nur im
Table-Layout, nicht im List-Layout. Status als volle Pille statt Quadrat;
Priority/T-Shirt nirgends als farbige Pille; keine "Add …"-Platzhalter;
keine überfälligen-rot-Logik; keine Aggregat-Totale im Spaltenkopf irgendwo.

**Umsetzung (dieser Durchgang):**
- [x] T502.1 Gemeinsames `ListToolbar`-Bauteil (View/Layout/Search/Fields/
      Filters/Group/Sort/Automate/Export/Sekundär-Aktionen/genau-eine-
      Primäraktion, als reine Anordnungs-„Shell", Inhalt bleibt beim
      aufrufenden Screen) — neu unter `src/ui/nextelite/ListToolbar.tsx`
- [x] T502.2 Retrofit in `ListClient.tsx` (Tasks-Liste, die Referenzansicht
      für die Toolbar-Reihenfolge) — bestehende Logik (Fields/Filters/Group/
      Sort/Export/SavedViews/CSV-Import/Primäraktion) 1:1 in den neuen
      Rahmen gehoben, keine Funktionsänderung an der Business-Logik
- [x] T502.3 Gruppierung um „Assignee" erweitert (`GroupKey`), Gruppenkopf
      zeigt jetzt Avatar + Label + Zähler (Avatar-Initialen aus dem
      Assignee-Namen, kein Foto-Feld in dieser Datenkette vorhanden) —
      Playwright-verifiziert gegen den Demo-Tenant
- [x] T502.4 `StatusSquare` (neu in `LegendKey.tsx`) links vor dem Task-
      Titel in der Liste (additiv, die volle Status-Pille als eigene,
      jetzt editierbare Spalte bleibt zusätzlich bestehen — Entfernen hätte
      Information gekostet, die Referenz zeigt beides als plausible
      Varianten). `PriorityPill` (neu) für die Priorität-Spalte
      (warningOutline/destructiveOutline je nach Wert). Überfällige
      Fälligkeitstermine rot (`isOverdue`, ignoriert erledigte Tasks).
      Typ/T-Shirt-Pillen NICHT umgesetzt — diese Felder sind aktuell nicht
      in die List-View-Datenkette verdrahtet (nur Priority ist es); das
      wäre eine Datenmodell-Erweiterung, keine reine Style-Änderung.
- [x] T502.5 List-Layout ist jetzt echt inline-editierbar (Status/Assignee/
      Start-/Fälligkeitsdatum/Priorität; vorher nur lesend, nur das
      separate Table-Layout konnte das) — Select-Felder (Assignee,
      Priorität) zeigen "+ Assignee"/"+ Priorität" als echten Platzhalter-
      Text in der `SelectValue`; Datumsfelder nutzen dasselbe native
      `<input type="date">` wie das bestehende Table-Layout (kein
      eigenständiger "+ Datum"-Text — ein nativer Date-Input kann das nicht
      ohne einen komplett neuen Popover-Datepicker, bewusst nicht gebaut in
      diesem Durchgang, siehe T502.6).
- [x] T502.6 Retrofit auf `ListToolbar` — umgesetzt für `MyTasksClient.tsx`
      (View/Layout-Zeile + Sort/Filter-Zeile, Layout-Segmented-Control
      List/Board/Kalender jetzt im `layout`-Slot) und
      `ProjectBudgetsClient.tsx` (View/Filters/Sort + „Neues Budget" als
      Primäraktion, vorher in einer separaten Kopfzeile). Die globale
      `/financials`-Übersicht (`FinancialsClient.tsx`) hat bewusst KEINEN
      Retrofit bekommen — sie hat aktuell gar keine Fields/Filters/Sort/
      Group-Controls, nur Titel + Primäraktion + Stat-Karten; ein
      `ListToolbar`-Wrapper um zwei Elemente ohne echte Toolbar-Struktur
      wäre reine Kosmetik ohne Mehrwert. Members-Liste ebenfalls NICHT
      angefasst (hat aktuell gar kein Sichten-/Filter-Konzept — bräuchte
      das erst grundsätzlich, kein reiner Retrofit).
      Noch offen: ein echter "+ Datum"-Platzhalter (eigener Popover-
      Datepicker statt nativem `<input type="date">`) — zurückgestellt,
      eigener Bauteil-Durchgang.
- [ ] T502.7 Aggregat-Totale im Spaltenkopf — siehe T504 (hängt an der
      DataViz-Arbeit)

## T503 — Detail-Muster (§04 der Referenz)

**Befund Slide-over (Task):** Aktionsleiste hat Timer/Watch/Link/Favorite/
Fullscreen, **fehlt Lock 🔒 und „⋯" More** (bewusst ausgelassen laut
Code-Kommentar — keine Sperr-Funktion vorhanden, keine weiteren
Bulk-Aktionen) — bleibt so. Breadcrumb zeigt nur Liste/Ref, kein
Projekt-Segment, nicht klickbar. Objekt-Subtabs vollständig + ein Extra
("Links"). **Fehlt „Bookings"-Tab** (nur Feed/Time). **Fehlt KI-
Zusammenfassungs-Icon (✦)** am Kommentarfeld. **Fehlt „Time to complete"**
als abgeleitetes Feld mit Über-/Unterschreitung rot. Swap-ohne-
Kontextverlust ist korrekt über Parallel-/Intercepting-Routes implementiert
— kein Fix nötig.

**Befund Full-Page (Budget):** Tab-Strip hat nur Services/Time/Invoices/
Scenarios/Feed — **fehlt Overview/Expenses/Purchase orders/Recurring** als
Tabs (Expenses/POs existieren als eigene Top-Level-Module statt als Budget-
Tabs). Kein Segment-Pille „Open → Delivered" (nur boolescher
„Delivered"-Toggle).

**Befund weitere Objekte:** Projekt hat bereits ein korrektes Full-Page-
Tab-Strip-Muster (`ProjectSubnav`). **Deal/CRM hat GAR KEIN Detail-Muster**
— weder Slide-over noch Full-Page, nur ein „Mark as lost"-Dialog.

**Umsetzung (dieser Durchgang):**
- [x] T503.1 „Time to complete"-Feld im Task-Property-Sidebar (Estimate −
      geloggte Zeit, negativ rot)
- [x] T503.2 Task-Breadcrumb um Projekt-Segment erweitert + klickbar
- [ ] T503.3 „Bookings"-Tab am Task — zurückgestellt (Bookings sind aktuell
      strukturell an Resourcing/Person gebunden, nicht an Task; bräuchte
      eigene Datenmodell-Prüfung, siehe „Bewusst zurückgestellt")
- [ ] T503.4 KI-Zusammenfassungs-Icon am Kommentarfeld — zurückgestellt
      (kein AI-Feature vorhanden, siehe T501.5)
- [ ] T503.5 Budget-Detail: Overview/Recurring-Tabs + Segment-Pille
      Open→Delivered — zurückgestellt (Expenses/PO bewusst NICHT zu Tabs
      degradiert, da als eigene Module funktional richtig; reine Pillen-
      /Overview-Tab-Ergänzung wäre eigener Durchgang)
- [ ] T503.6 Deal-Detail-Screen (Slide-over oder Full-Page) — zurückgestellt,
      eigenständiges neues Feature (aktuell nur Board+Dialog), kein
      Redesign eines bestehenden Screens

## T504 — DataViz (§05 der Referenz)

**Befund:** **Kein Inline-Donut-Bauteil existiert** — größte Einzellücke,
sogar ein bestehender Code-Kommentar in `ReportBuilderClient.tsx` verweist
auf „dieselbe Palette wie Inline-Donuts der Listen", die es gar nicht gibt.
`Progress`-Bauteil existiert und wird breit wiederverwendet (Budgets-Liste,
Budget-Detail, Resourcing, Dashboard) — aber nur 2-stufig (success/
destructive), nie die vorhandene `warning`-Variante. Aggregat-Totale sitzen
als Stat-Card-Leiste ÜBER der Tabelle, nicht im Spaltenkopf. `tabular-nums`
ist global korrekt (TableCell), Rechtsbündigkeit + Negativ-Rot aber nur
Ad-hoc pro Spalte. Resourcing-Bars sind eigentlich Pills, keine Balken, kein
Blass-Zustand für Teil-Tage.

**Umsetzung (dieser Durchgang):**
- [x] T504.1 Neues `InlineDonut`-Bauteil (`src/ui/nextelite/InlineDonut.tsx`),
      RAG-gefärbt, für Tabellenzellen
- [x] T504.2 Eingesetzt in Budgets-Liste (Invoiced %) und Budget-Detail-
      Services-Tabelle (Usage %) neben dem bestehenden Balken
- [x] T504.3 Dritte RAG-Stufe („nähert sich", `warning`) in den bestehenden
      `Progress`-Einsatzstellen aktiviert (Budgets-Liste, Budget-Detail,
      Resourcing, Dashboard)
- [ ] T504.4 Aggregat-Totale in den Spaltenkopf verschieben (statt Stat-Card-
      Leiste) — zurückgestellt, siehe unten
- [ ] T504.5 Resourcing-Bars von Pills zu echten Balken + Blass-Zustand für
      Teil-Tage — zurückgestellt, eigener gründlicher Durchgang nötig (Timeline-
      Grid-Geometrie)
- [ ] T504.6 Systematische Rechtsbündigkeit + Negativ-Rot als Tabellen-
      Primitive statt Ad-hoc — zurückgestellt

---

## Bewusst zurückgestellt (eigener, größerer Anlauf nötig)

Diese Punkte sind identifiziert, aber bewusst NICHT in diesem Durchgang
gebaut — jeweils weil sie entweder ein eigenständiges neues Feature sind
(keine Redesign-Aufgabe) oder eine Umstrukturierung mit hohem Blast-Radius
bräuchten, die einen eigenen, fokussierten Anlauf verdient (Muster dieser
Session: lieber ehrlich zurückstellen als hastig/riskant durchziehen):

- **AI-Assistant-Sidebar** (T501.5) + **KI-Zusammenfassung am Kommentarfeld**
  (T503.4): echte KI-Integration (LLM-Anbindung, Prompt-Engineering,
  Kosten/Rate-Limits) — kein UI-Redesign-Thema.
- **Globaler Kontext-Balken** (T501.4): bräuchte eine neue, seitenweite
  Datenquelle „aktuelle Entity + Company", die aktuell nirgends zentral
  vorliegt — jede Seite müsste ihren Breadcrumb-Kontext an die Shell
  durchreichen. Strukturell größer als die anderen Fixes dieser Phase.
  Ist die einzige P1-Chrome-Lücke, die offen bleibt.
- **Members-Toolbar-Retrofit** (Teil von T502.6): Members hat aktuell gar
  kein Sichten-/Filter-/Sort-Konzept — bräuchte das erst grundsätzlich
  eingeführt, kein reiner `ListToolbar`-Retrofit. Budgets- und My-Tasks-
  Toolbar sind inzwischen umgesetzt (siehe T502.6 oben).
- **Bookings-Tab am Task** (T503.3), **Budget Overview/Recurring-Tabs +
  Status-Pille** (T503.5), **Deal-Detail-Screen** (T503.6): jeweils neue
  Datenmodell-/Routing-Arbeit, kein reiner Style-Fix.
- **Aggregat-Totale im Spaltenkopf** (T504.4), **Resourcing-Balken-Umbau**
  (T504.5), **Tabellen-Rechtsbündigkeit/Negativ-Rot als Primitive**
  (T504.6): strukturelle Tabellen-Änderungen mit vielen Aufrufern —
  eigener, sorgfältiger Durchgang statt Sammel-Fix.

## Nicht wiederholt in diesem Durchgang

Ein erneuter, wortwörtlicher Nachbau einzelner Screens Pixel für Pixel
(z. B. exakte Popover-Geometrie des Resourcing-Buchungs-Editors) wurde nicht
durchgeführt — die Referenz selbst sagt: „Keine neuen Module — die zwei,
drei Muster … einmal richtig bauen und überall anwenden" (§08 Merksatz).
Genau das ist der Fokus dieser Phase: Muster, nicht Pixel-Klone einzelner
Screens.
