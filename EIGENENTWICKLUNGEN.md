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

## Bewusst behalten (entschieden, keine weitere Aktion nötig)

### `TransitionRule` ("Übergangsregeln") — final bewertet (T308, 16.09.2026)
- **Wo:** `prisma/tenant/schema.prisma` (`model TransitionRule`),
  `src/tenant/workflow/transitionValidation.ts`,
  `src/app/(tenant)/(app)/projects/[id]/settings/workflow/WorkflowEditorClient.tsx`
  (Abschnitt "Übergangsregeln"), `src/app/api/tenant/tasks/[id]/route.ts` (Validierung
  beim Statuswechsel).
- **Befund:** Productive kennt Pflichtfelder nur objektweit bei Erstellung (Required
  Custom Fields für Budgets/Bookings/Deals/Companies) — nicht pro Status-Übergang.
- **Erneute Bewertung (jetzt, da Required Custom Fields aus T220 stehen):** kein Ersatz
  möglich — die beiden Features lösen unterschiedliche Probleme. Required Custom Fields
  (T220) verhindert nur, einen bereits gesetzten Wert über die Value-Write-Route auf
  leer zu setzen; es prüft nie bei einem Status-Wechsel. `TransitionRule` prüft genau
  das: "bevor ein Task nach 'Done' wechselt, müssen Assignee/Fälligkeitsdatum/Custom
  Field X gesetzt sein" — ein Workflow-Gate zum Übergangszeitpunkt, das es in Productive
  so nicht gibt, aber das Required Custom Fields strukturell nicht abdecken kann (auch
  mit `required: true` bliebe ein Task ohne Assignee weiterhin frei nach 'Done'
  verschiebbar).
- **Entscheidung:** `TransitionRule` bleibt als eigenständiges, funktionierendes
  Feature ohne Productive-Entsprechung bestehen (mischt eingebaute Felder wie
  Assignee/Fälligkeitsdatum mit `custom:<fieldId>`-Referenzen generisch) — kein
  Funktionsverlust durch Entfernung riskieren für eine Productive-Parität, die es
  strukturell nicht geben kann. Keine weitere Aktion nötig.

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

### `TaskPriority` / `TaskTShirtSize` — ERSETZT (T223/T224, 16.09.2026)
- **Wo (vorher):** `prisma/tenant/schema.prisma` (`enum TaskPriority`,
  `enum TaskTShirtSize`, `Task.priority`, `Task.tShirtSize`), Board/Tabelle/
  Task-Detail/New-Task-Modal/Server-Loader/Creation-Route.
- **Befund:** Productive hat kein natives Prioritätsfeld — immer ein Custom Field
  (Artikel "Task Prioritization With Custom Fields").
- **Umsetzung:** Custom-Field-Filter/Sort (T201-T208) und Auto-Attach (T222) standen,
  daher migriert statt weiter zurückgestellt: `src/tenant/customFields/systemTaskFields.ts`
  legt zwei System-Library-Felder ("Priority", "T-Shirt Size", beide `select`,
  `autoAttach: true`) an, backfillt jeden Task aus dem alten Enum-Wert in eine
  `CustomFieldValue`-Zeile und setzt die Legacy-Spalte danach auf ihren Leerzustand
  zurück (verhindert, dass ein später über das Custom Field gelöschter Wert aus der
  inzwischen veralteten Spalte wieder auftaucht). Alle Lese-/Schreibstellen
  (New-Task-Modal, Board/Tabelle/Liste/Task-Detail, Creation-/PATCH-Route) migriert;
  Priorität/T-Shirt-Size laufen jetzt vollständig über den generischen
  Custom-Field-Mechanismus (gleiche `CustomFieldInput`-Komponente, gleiche
  Filter/Sort-UI wie jedes andere Custom Field).
- **Bewusst nicht Teil dieser Änderung:** die `TaskPriority`/`TaskTShirtSize`-Spalten
  bleiben vorerst im Schema (nur noch ungenutzt, durch das Backfill immer auf ihrem
  Leerzustand) — ein tatsächliches `DROP COLUMN` ist eine separate, risikoärmere
  Aufräum-Migration für einen Review-Zeitpunkt bei Tageslicht, keine, die man nachts
  ohne Rückfrage fahren sollte.
