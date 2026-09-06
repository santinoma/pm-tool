# Spec: project-creation-wizard

## Objective
Ersetzt das einfache "Name + Beschreibung"-Formular durch einen mehrstufigen
Wizard (angelehnt an Productive.io): Projekttyp, Vorlage, Details, Module,
Mitglieder. Führt dabei mehrere neue, tragende Konzepte ein: Projekttyp
(Client/Internal), einfaches Firmen-Verzeichnis, Projekt-Farbe, Projektleiter,
Vorlagen (jedes Projekt markierbar), Modul-Auswahl pro Projekt, und — als
größter Einzelbaustein — echte Projekt-Mitgliedschaft mit vollständiger
Zugriffsbeschränkung über praktisch alle projekt-bezogenen Routen.

## Assumptions (bestätigt)
1. **Module-Auswahl**: Nur echte, bereits existierende PM-Atlas-Module sind
   auswählbar (Tasks fest an, Docs=Wiki, Budgets+Invoices kombiniert, Time,
   Activity). Für die von Productive beschriebenen, aber in PM-Atlas noch
   nicht existierenden Module (Forms, Meetings, Deals, Expenses, Dashboard,
   Resource planning, Reports, Purchase Orders) werden deaktivierte
   "Bald verfügbar"-Einträge angezeigt — keine Funktion dahinter, nur als
   Erinnerung für spätere Versionen.
2. **Templates**: Jedes Projekt kann in seinen Einstellungen als Vorlage
   markiert werden (`Project.isTemplate`). "Create from template" klont
   Workflow-Status + Modul-Auswahl (keine Tasks/Daten) in das neue Projekt.
3. **Client/Firma**: Neues schlankes `Client`-Modell (Firmenname, optionale
   Notiz), tenant-weit, verwaltbar in den Einstellungen, wählbar bei
   Projekt-Anlage. Kein CRM (Kontakte, Pipelines) — das bleibt explizit für
   eine spätere Version.
4. **Projekt-Mitgliedschaft**: Vollständige Durchsetzung — nicht nur die
   Haupt-Projektseiten, sondern auch alle verschachtelten Ressourcen (Tasks,
   Kommentare, Anhänge, Budgets/Sections/Invoices, Cycles, Baselines,
   Wiki-Seiten, Shared Views, Suche) werden auf Projekt-Mitgliedschaft
   geprüft. Owner/Admin sehen weiterhin uneingeschränkt alles (Verwaltungs-
   Notwendigkeit). Die bestehende `client`-Portal-Rolle nutzt weiterhin ihren
   eigenen Mechanismus (`ProjectClientAccess`), unverändert.
5. Ein Task kann (Cross-Tagging) in mehreren Projekten hängen — Zugriff ist
   erlaubt, sobald der Nutzer Mitglied *mindestens eines* der verknüpften
   Projekte ist.

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant DB), Vitest.

## Project Structure
- `src/tenant/projectAccess/resolveProjectMembership.ts` — Kernprüfung + Resolver für verschachtelte Ressourcen
- `src/tenant/clients/` — Client-CRUD
- `src/tenant/projectTemplates/cloneProjectTemplate.ts` — Klon-Logik
- `src/app/(tenant)/projects/new/` — Wizard-UI (mehrstufig)
- `src/app/api/tenant/clients/*`, `.../projects/[id]/members/*`, `.../projects/[id]/mark-template/*`
- `tests/projectMembership.test.ts`, `tests/projectWizard.test.ts`

## Testing Strategy
Vitest Unit-Tests für die reine Zugriffslogik, Integrationstest über
`provisionTenant()`, Docker-E2E via curl (Nicht-Mitglied wird über mehrere
Ressourcentypen hinweg geblockt, Mitglied/Owner/Admin nicht).

## Boundaries
- Always: Owner/Admin behalten uneingeschränkten Zugriff.
- Ask first: Änderungen an der Client-Portal-Zugriffslogik (bleibt unangetastet).
- Never: CRM-Funktionalität (Kontakte, Pipelines) in diesem Schritt bauen.

## Success Criteria
- Wizard führt durch alle 5 Schritte, legt Projekt mit Typ/Farbe/Client/
  Projektleiter/Workflow/Modulen/Mitgliedern an.
- Vorlage klonen erzeugt neues Projekt mit identischem Workflow + Modul-Set.
- Nicht-Mitglied bekommt über Task-Detail, Kommentare, Budget, Cycle,
  Baseline, Wiki, Shared-View, Suche hinweg konsistent 403/404 verweigert.
- Owner/Admin bleiben von der Beschränkung unberührt.
