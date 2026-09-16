# Eigenentwicklungen ohne Productive.io-Entsprechung

Diese Datei sammelt Features aus dem Redline-Audit (16.09.2026), die keine dokumentierte
Grundlage in help.productive.io haben. Ziel ist **nicht** automatisches Entfernen —
sondern eine Stelle, an der wir bewusst entscheiden: kennzeichnen & behalten, oder durch
die "richtige" Productive-Umsetzung ersetzen, sobald die zugehörige Phase drankommt.

Regel (Stand 16.09.2026, siehe Chat): Hat eine Eigenentwicklung eine erkennbare
Entsprechung in einer künftigen Roadmap-Phase (z. B. Custom Fields), wird sie dort durch
die korrekte Productive-Umsetzung **ersetzt**, statt nur markiert zu werden. Nur wenn es
keine solche Entsprechung gibt, bleibt sie als eigenständiges, klar gekennzeichnetes
Feature bestehen.

## Offen — noch zu entscheiden

### `TransitionRule` ("Übergangsregeln")
- **Wo:** `prisma/tenant/schema.prisma` (`model TransitionRule`),
  `src/tenant/workflow/transitionValidation.ts`,
  `src/app/(tenant)/(app)/projects/[id]/settings/workflow/WorkflowEditorClient.tsx`
  (Abschnitt "Übergangsregeln"), `src/app/api/tenant/tasks/[id]/route.ts` (Validierung
  beim Statuswechsel).
- **Befund:** Productive kennt Pflichtfelder nur objektweit bei Erstellung (Required
  Custom Fields für Budgets/Bookings/Deals/Companies) — nicht pro Status-Übergang.
- **Mögliche Entsprechung:** Required Custom Fields (Phase 2/3, zusammen mit
  Custom-Fields-Ausbau). Wenn dieses Feature kommt, prüfen ob `TransitionRule` dadurch
  ersetzt werden kann/soll, oder ob beides nebeneinander bestehen bleibt (unterschiedliche
  Trigger-Zeitpunkte: Erstellung vs. Status-Übergang).
- **Entscheidung:** noch offen.

## Bewusst behalten (entschieden, keine weitere Aktion nötig)

### Cycles, Baselines, Hill Chart, Triage, Check-ins
- **Wo:** `src/tenant/projects/moduleCatalog.ts`, jeweilige Feature-Ordner unter
  `src/app/(tenant)/(app)/projects/[id]/`.
- **Befund:** Keine Productive-Entsprechung (Cycles/Baselines/Hill Chart/Triage/Check-ins
  sind in Productive keine eigenen Objekte/Tabs).
- **Entscheidung (16.09.2026):** Behalten — echte, funktionierende Features, deren
  Entfernung ein Funktionsverlust wäre. Umgesetzt: alle fünf sind jetzt explizit
  abwählbare Module im "Module"-Schritt der Projekterstellung (`MODULE_CATALOG`),
  statt Nutzern stillschweigend Productive-Parität vorzutäuschen. Damit erledigt,
  keine weitere Aktion nötig.

## Ersetzt statt nur markiert (Beispiel-Fall aus der Chat-Anweisung)

### `TaskPriority` / `TaskTShirtSize`
- **Wo:** `prisma/tenant/schema.prisma` (`enum TaskPriority`, `enum TaskTShirtSize`,
  `Task.priority`, `Task.tShirtSize`), ca. 8 Verwendungsstellen (Board/Tabelle/
  Task-Detail/New-Task-Modal/Server-Loader/Creation-Route — siehe Exploration vom
  16.09.2026 im Chat-Verlauf).
- **Befund:** Productive hat kein natives Prioritätsfeld — immer ein Custom Field
  (Artikel "Task Prioritization With Custom Fields").
- **Mögliche Entsprechung:** Custom-Fields-Ausbau (Phase 2/3): sobald Custom-Field-
  Filter/Sort und ein Auto-Attach-Mechanismus existieren, `priority`/`tShirtSize` als
  echte `select`-Custom-Fields migrieren und die nativen Enum-Felder entfernen.
- **Status:** noch nicht umgesetzt (Migration jetzt zu riskant — siehe Plan vom
  16.09.2026: kein Auto-Attach, würde Sortierbarkeit in der Tabellenansicht ersatzlos
  entfernen). Bugfix (PATCH-Route übernahm `priority`/`tShirtSize` nicht) bereits
  erledigt, unabhängig von der Migration.
