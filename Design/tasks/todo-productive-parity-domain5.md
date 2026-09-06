# Task List: Produktiv-Parität Domäne 5 (Automation/Extensibility)

Quelle: `tasks/plan-productive-parity-roadmap.md`, Domäne 5. Öffentliche API
und PAT-Verwaltung existierten bereits (v1/tasks, v1/projects,
`ApiKeysClient.tsx`) — Umfang entsprechend auf die echten Lücken angepasst.

## Automation-Aktionsbibliothek + Multi-Projekt-Scope + Bulk-Ausführung — ✅ erledigt
- [x] `create_task`/`create_subtask`/`create_todo`-Aktionstypen implementiert
- [x] `send_email` bewusst als dokumentiertes No-op (keine E-Mail-Infrastruktur
  im Projekt vorhanden, kein neuer Infrastruktur-Aufbau) — aus der UI
  ausgeblendet
- [x] `AutomationRule.projectIds` (leer = alle Projekte, sonst gescoped) —
  Legacy-Regeln ohne gesetztes Feld bleiben unverändert funktionsfähig
- [x] "Find Object"-Bulk-Ausführung: zeitbasierte Regeln (`time_daily`/
  `time_weekly`) laufen jetzt gegen ALLE passenden Tasks (Status-Kategorie +
  Projekt-Scope), nicht mehr nur "Run Now" auf einen Task — gedeckelt bei
  200 Tasks pro Lauf, dokumentiert
- [x] Test: `automationExpansion.test.ts` (13 Tests)

## API-Key-Scopes + Rate-Limiting + erweiterte v1-API + Docs — ✅ erledigt
- [x] `ApiKey.scope` (read_only/read_write), Durchsetzung in jeder v1-Route
- [x] In-Memory Rate-Limit: 100 Requests/10s pro Key, zentral in
  `authenticateApiKey.ts`, 429 + `Retry-After`
- [x] `v1/budgets` (nur GET, bewusst nie schreibbar über die öffentliche API),
  `v1/time-entries` (GET+POST)
- [x] Echte API-Doku-Seite (`settings/organization/api-docs`) mit realen
  Beispielen aus dem tatsächlichen Route-Code
- [x] Test: `rateLimit.test.ts` (5 Tests)

## CSV-Import (Tasks + Clients) — ✅ erledigt
- [x] Abhängigkeitsfreier CSV-Parser (Quotes, eingebettete Kommas, CRLF)
- [x] All-or-Nothing-Validierung: bei JEDEM ungültigen Zeilenfehler wird
  NICHTS importiert (verhindert verwirrende Teil-Importe)
- [x] Vorlagen-Download, Fehlerliste pro Zeile in der UI
- [x] Test: `parseCsv.test.ts` + `validateImportRow.test.ts` (24 Tests)

## Generischer CSV-Export — ✅ erledigt
- [x] `buildCsv()` mit korrektem RFC-4180-Escaping
- [x] `GET /api/tenant/exports/csv` (bewusst GET für simplen Link-Download,
  Auth über Cookie nicht URL) — respektiert `privateTaskVisibilityFilter`,
  private Tasks können nicht in den Export durchsickern
- [x] Export-Button in List-View und Report-Builder
- [x] Test: `buildCsv.test.ts` (12 Tests)

## Umsetzung: 4 parallele Agenten (2026-08-27)
Alle vier Agenten liefen gegen dieselbe vorab migrierte Schema-Basis; drei
von ihnen stießen auf denselben erwarteten Zwischenzustand (Typfehler in
`automations/page.tsx`, verursacht vom vierten, noch laufenden Agenten) und
meldeten ihn korrekt als "nicht mein Scope" statt ihn selbst zu reparieren.
Zentral verifiziert: Build + volle Testsuite grün (684/684, davon 54 neue
Tests), Docker-E2E (Read-only-Key blockiert POST mit 403, Rate-Limit greift
nach 99 Requests, CSV-Vorlage und -Export liefern korrekte Header/Daten,
API-Docs-Seite rendert). 228 verwaiste Test-DBs bereinigt.

## Checkpoint: Abschluss
- [x] Tests+Build grün (684/684), Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
