# Spec: Productive.io-Parität — PM·Atlas

## Zweck

Dieses Verzeichnis ist der persistente Zustand für die Umsetzung des Redline-Audits
(16.09.2026, siehe Chat-Verlauf / veröffentlichtes Artefakt "Redline-Audit"). Es existiert,
damit die Arbeit über Sitzungsgrenzen und Token-Limits hinweg fortsetzbar ist, ohne den
Chat-Verlauf zu benötigen: `plan.md` ist die technische Roadmap, `tasks.md` die
abhakbare Checkliste. Eine neue Session (frisch oder fortgesetzt) liest zuerst diese
drei Dateien, bevor sie weiterarbeitet.

## Quelle der Wahrheit

Verhalten muss mit help.productive.io übereinstimmen. Bei Unklarheit: `mcp__Productive__search_help`
konsultieren, nicht raten. Der ursprüngliche Audit (5 parallele Domain-Vergleiche) ist
im veröffentlichten Artefakt "Redline-Audit" zusammengefasst; `plan.md` verdichtet daraus
die konkreten Arbeitsschritte.

## Entscheidungsregel für Eigenentwicklungen

(Siehe auch `../EIGENENTWICKLUNGEN.md`.) Hat eine Eigenentwicklung ohne Productive-Basis
eine erkennbare Entsprechung in einer der folgenden Phasen, wird sie dort durch die
korrekte Productive-Umsetzung **ersetzt** statt nur markiert (Beispiel: `TaskPriority`
→ Custom Field, sobald der Custom-Fields-Ausbau in Phase 2 ansteht). Nur wenn keine
Entsprechung existiert oder die Ersetzung eigenständige Vorarbeit bräuchte, die noch
nicht ansteht, wird sie in `EIGENENTWICKLUNGEN.md` dokumentiert und offen gelassen.

## Arbeitsweise pro Task

1. Task in `tasks.md` lesen, betroffene Dateien im Code verifizieren (können seit
   Audit-Zeitpunkt abgewichen sein).
2. Bei Unklarheit über Productive-Verhalten: `mcp__Productive__search_help` fragen.
3. Umsetzen, `npx tsc --noEmit` + `npx eslint` auf geänderten Dateien.
4. Bei Schema-Änderungen: Migration schreiben, auf `pmtool_tenant_demo` UND
   `pmtool_tenant_ent` anwenden (`TENANT_DATABASE_URL=... npx prisma migrate deploy
   --config prisma.tenant.config.ts`), dann `npx prisma generate`.
5. Test(s) ergänzen/anpassen.
6. Task in `tasks.md` abhaken, kurzer Commit (Pattern: `git commit`, Attribution-Footer
   wie im Rest der Session).
7. Nach jeder abgeschlossenen Phase (nicht nach jedem einzelnen Task): vollständiger
   `npx vitest run` im Hintergrund, erst danach pushen.

## Bekannte Rahmenbedingungen

- Demo-Tenant: `demo@demo.de` / `Test1234!` auf `demo.localhost:3000`.
- Scratch-Skripte immer unter `/tmp` bzw. Scratchpad, nie ins Repo committen; danach
  löschen. Scratch-DB-Zeilen nach Playwright-Verifikation wieder entfernen.
- Branch: `claude/magical-johnson-dxir93` — dorthin pushen, nicht auf einen anderen.
- Postgres läuft nicht automatisch nach einem Container-Neustart — vor Testläufen mit
  `service postgresql start` prüfen/starten, falls `ECONNREFUSED` auftritt.
