# Spec: `design-foundation` (Next-Elite-Migration, Modul 1/15)

## Objective
Die App-weite Design-Basis schaffen, auf der alle weiteren Module (siehe `NEXTELITE-MIGRATION-CAPABILITY-MAP.md`) aufbauen: Tailwind CSS 4 + shadcn/ui (Next-Elite-Palette, bereits 1:1 übernommen) + Framer Motion, **nicht mehr auf `/v3` gescoped, sondern app-weit verfügbar**. Enthält die beiden Haupt-Shells (Tenant-App-Shell, Platform-Admin-Shell) im Next-Elite-Look, plus die Primitives-Bibliothek, auf die jedes Folgemodul zugreift.

Nutzer: interne Entwickler (dieses Modul hat keine direkten End-Nutzer-Seiten, ist reine Infrastruktur für Modul 2–15).

Erfolg = jedes Folgemodul kann `AppShellNextElite` / `AdminShellNextElite` + die Primitives importieren, ohne eigene Design-Entscheidungen treffen zu müssen.

## Bereits vorhanden (aus dem `/v3`-Testlauf, wird hier erweitert/verallgemeinert)
- `src/ui/shadcn/tokens.css` — Next-Elite-Palette 1:1, aktuell unter `.se-scope` isoliert
- `src/ui/shadcn/tailwind.css` — Tailwind ohne Preflight
- `src/ui/shadcn/components/*` — Button, Dialog, DropdownMenu, Avatar, Breadcrumb, ToggleGroup, Sheet, Badge, Input, Label, Tooltip, Separator
- `src/app/(platform-admin)/v3/AdminShellV3.tsx` — Platform-Admin-Shell (wird zu `AdminShellNextElite`)

## Entscheidungen (2026-08-27)
1. **Design-Intelligence-Skill**: `ui-ux-pro-max` ist installiert und geprüft (`.claude/skills/ui-ux-pro-max`, lokale CSV-Suche, kein Netzwerk-/Exec-Zugriff im Skript). Wird ab sofort für Style-/Farb-/Typografie-/Motion-Entscheidungen in jedem Modul herangezogen (`python .../search.py "<query>" --design-system`), ergänzend zu den 1:1 aus Next-Elite übernommenen Tokens.
2. **Preflight/Scoping**: Tailwind bleibt bis auf Weiteres *ohne* Preflight, Tokens bleiben unter `.se-scope` gescoped (kollidiert sonst mit `globals.css`/v1). Wird erst global, wenn kein Modul mehr v1-Klassen nutzt (nach `settings`, vorletztes Modul).
3. **Navigation**: Bestehende Menüstruktur aus `ui/shell/AppShell.tsx` (Projekte, Meine Tasks, Zeiterfassung, Ressourcen, Berichte, ...) inhaltlich 1:1 übernehmen, nur die Optik wechselt auf Next-Elite.
4. **Dark Mode**: Theme-Toggle wird jetzt mitgebaut (Button in der Topbar + `localStorage`-Persistenz + `.se-scope.dark`-Klasse), analog zum Next-Elite-Original.

## Tech Stack
- Next.js 16.3 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS 4 (`@tailwindcss/postcss`), shadcn/ui-Primitives (Radix), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
- Framer Motion (`framer-motion`, bereits Abhängigkeit) für Seitenübergänge, Hover-States, Scroll-Reveals — ersetzt die bisherigen CSS-Transitions aus v1/v2
- **Nicht übernommen aus Next-Elite:** `better-auth`, `next-intl`, `@sentry/nextjs`, `three`, Playwright/oxlint/knip/lefthook/commitlint (PM-Tool hat eigene Auth/RBAC, kein i18n, eigenes Test-Tooling)

## Commands
```
Dev:       npm run dev
Build:     npm run build
Typecheck: npx tsc --noEmit
Lint:      npm run lint
Test:      npm test
```

## Project Structure (neu/geändert in diesem Modul)
```
src/ui/shadcn/tokens.css              → app-weite Tokens (nicht mehr /v3-only)
src/ui/shadcn/tailwind.css            → app-weiter Tailwind-Entry
src/ui/shadcn/components/*            → Primitives (erweitert um Sidebar, Command, Table, Select, Tabs, Sonner/Toast — je nach Modulbedarf ergänzt)
src/ui/nextelite/AppShellNextElite.tsx   → Tenant-Shell (ersetzt ui/shell/AppShell.tsx, ui/v2/AppShellV2.tsx)
src/ui/nextelite/AdminShellNextElite.tsx → Platform-Admin-Shell (ersetzt ui/shell/AdminShell.tsx, v2/v3 Varianten)
```
`src/ui/v2/**`, `src/app/(platform-admin)/v2/**`, `src/app/(platform-admin)/v3/**` (Testversion) werden erst **nach** Abschluss aller 15 Module gelöscht (siehe Löschstrategie unten).

## Code Style
Beispiel (Muster aus dem bereits gebauten `/v3`-Testlauf, wird für alle Module fortgeführt):
```tsx
<Card>
  <CardHeader><CardTitle>Projekte</CardTitle></CardHeader>
  <CardContent>
    <Button variant="outline" size="sm"><Plus /> Neu</Button>
  </CardContent>
</Card>
```
- Funktionskomponenten, `cn()` für Klassenzusammenführung, `data-slot`-Attribute wie in shadcn üblich
- Deutsche UI-Texte (Projektkonvention), englische Prop-/Variablennamen

## Testing Strategy
- `npx tsc --noEmit` + `npm run lint` nach jeder Datei (bestehende Konvention dieser Session)
- Kein automatisiertes Browser-Testing verfügbar in dieser Session (kein Chrome-DevTools-MCP) → jede migrierte Seite braucht manuelle Sichtprüfung durch dich, bevor ihr v1/v2/v3-Code gelöscht wird
- Nach jedem Modul: Subdomain-Regressionscheck (`admin.localhost`, `<tenant-subdomain>.localhost` lokal über `/etc/hosts` oder Wildcard-DNS)

## Boundaries
- **Immer:** Typecheck + Lint vor jedem Commit; v1/v2/v3-Code eines Moduls erst löschen, nachdem die Next-Elite-Version manuell von dir bestätigt wurde; Subdomain-Routing (`proxy.ts`) unangetastet lassen
- **Vorher fragen:** neue npm-Abhängigkeiten außerhalb der bereits installierten shadcn/Radix/Tailwind-Familie; Änderungen an `proxy.ts`/`tenant/resolveTenant.ts`; Löschen von v1/v2/v3-Dateien
- **Nie:** `better-auth`/`next-intl`/Sentry/Three.js aus Next-Elite übernehmen; Prisma-Schema für dieses rein optische Vorhaben anfassen; alle Module in einem Rutsch löschen, bevor ihr Ersatz steht

## Löschstrategie (gilt für alle 15 Module)
Pro Modul: 1) Next-Elite-Version bauen → 2) von dir manuell verifiziert (inkl. Subdomain-Check) → 3) erst dann alter v1/v2/v3-Code des Moduls gelöscht. `design-foundation` selbst wird nie "gelöscht" — es bleibt die Basis. Die Dateien `ui/v2/theme.css`, `globals.css`-Legacy-Klassen etc. werden erst entfernt, wenn **kein** Modul mehr darauf verweist (nach `settings`, vorletztes Modul lt. Build-Reihenfolge).

## Success Criteria
- [ ] `AppShellNextElite` und `AdminShellNextElite` existieren, sind app-weit (nicht `/v3`-scoped) einbindbar
- [ ] Theme-Toggle (hell/dunkel, `localStorage`-persistiert) funktioniert in beiden Shells
- [ ] Primitives-Set deckt die in Modul 2–15 erwartbaren Bausteine ab (Sidebar, Table, Select, Tabs, Command mindestens)
- [ ] `npx tsc --noEmit` und `npm run lint` sauber
- [ ] `admin.localhost` und mind. ein Test-Tenant-Subdomain funktionieren weiterhin unverändert (Regressionscheck)
- [ ] Du hast die Shells visuell abgenommen

## Open Questions
Keine offen — siehe „Entscheidungen“ oben.
