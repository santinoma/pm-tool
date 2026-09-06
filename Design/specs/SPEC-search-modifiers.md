# Spec: search-modifiers (v2 Modul 9)

## Objective
Die bestehende Cmd+K-Suche versteht zusätzlich JQL-lite-Modifier direkt in
derselben Eingabe (`status:done`, `assignee:me`, `project:"Name"`) neben
normalem Freitext — ohne Jiras Lernkurve, ein "Advanced"-Toggle zeigt eine
Kurzreferenz.

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
src/tenant/search/parseSearchQuery.ts        → reine Parser-Funktion
src/app/api/tenant/search/route.ts           → Modifier-Filterung ergänzt
src/ui/commandPalette/CommandPalette.tsx     → Advanced-Toggle mit Kurzreferenz
tests/                                        → Unit-Tests
```

## Code Style
Bestehende Muster: reine Funktionen für Parsing/Logik, Field-Atlas-CSS für
die Kurzreferenz.

## Testing Strategy
Vitest für `parseSearchQuery()` (Modifier-Erkennung, Quoting, Freitext-Rest,
Status-Synonyme). Docker-E2E: `status:done`, `assignee:me`,
`project:"X"`-Kombinationen liefern korrekt gefilterte Ergebnisse; Suche
ohne Modifier verhält sich unverändert.

## Boundaries
- Always: Ohne Modifier bleibt das bisherige Verhalten (Projekte + Tasks)
  unverändert — kein Breaking Change für bestehende Nutzung.
- Ask first: Boolesche Operatoren (AND/OR/NOT), Klammerung — bewusst
  außerhalb des "kein Jira-Lernkurve"-Scopes.
- Never: Bei ungültigem/unbekanntem Modifier-Wert einen Fehler werfen —
  unbekannte Werte werden ignoriert, die Suche bleibt nutzbar.

## Success Criteria
- `status:done`, `assignee:me`, `project:"Name"` (auch kombiniert) filtern
  die Task-Suche korrekt.
- Freitext neben Modifiern filtert zusätzlich auf den Titel.
- Suche ganz ohne Modifier liefert weiterhin Projekte + Tasks wie bisher.
- Advanced-Toggle in der Command-Palette zeigt/versteckt die
  Syntax-Kurzreferenz.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt.
