# Plan: `design-foundation` (Next-Elite-Migration, Modul 1/15)

Spec: `tasks/SPEC-design-foundation.md` · Capability Map: `NEXTELITE-MIGRATION-CAPABILITY-MAP.md`

## Design-Intelligence-Input (via `ui-ux-pro-max`)
Query `"internal saas dashboard admin tool" --design-system --density 8 --motion 5` lieferte u. a.:
- **Übernommen:** Motion-Timing (Hover 150–300ms, Stagger-Listen 300–450ms mit `back.out(1.4)`-Easing), `prefers-reduced-motion`-Pflicht, Responsive-Checkpunkte (375/768/1024/1440px), Pre-Delivery-Checkliste (keine Emoji-Icons, `cursor-pointer` auf Klickbarem, sichtbare Fokus-States, 4.5:1-Kontrast)
- **Bewusst NICHT übernommen:** Die vorgeschlagene Farbpalette (dunkles Tech-Theme) und Schriftart (Fira Code/Sans) — bleibt bei der explizit angeforderten 1:1-Next-Elite-Palette (`#5c4beb` Primary, helles Theme als Default) und System-Font-Stack

## Komponenten & Reihenfolge

1. **Tokens app-weit lösen** — `tokens.css`/`tailwind.css` bleiben inhaltlich wie im `/v3`-Test, aber `.se-scope` wird an einer Stelle eingebunden, die die ganze App umschließt (nicht mehr nur `(platform-admin)/v3/layout.tsx`). Root-Layout (`src/app/layout.tsx`) bekommt den Tailwind-Import; `.se-scope`-Wrapper wandert dorthin. **Risiko:** `globals.css` (v1) ist ebenfalls global importiert — beide müssen so lange koexistieren, bis das letzte Modul migriert ist. Mitigation: Preflight bleibt deaktiviert, `.se-scope` bleibt die Isolationsgrenze (siehe Spec Punkt 2), zusätzlich Regressionscheck nach diesem Schritt auf allen v1-Seiten.
2. **Theme-Toggle** — `ThemeToggle`-Komponente (Button, `lucide-react` Sun/Moon-Icons), liest/schreibt `localStorage` + setzt `.se-scope.dark`. `next-themes` wird NICHT installiert (neue Abhängigkeit, per Spec "vorher fragen") — stattdessen ein kleiner selbstgebauter Hook (`useTheme`), das reicht für den Scope.
3. **`AppShellNextElite`** — ersetzt künftig `ui/shell/AppShell.tsx` (v1) und `ui/v2/AppShellV2.tsx`. Übernimmt Navigationsstruktur 1:1 aus `ui/shell/AppShell.tsx` (Projekte, Meine Tasks, Zeiterfassung, Ressourcen, Berichte + Sub-Items), gebaut wie `AdminShellV3.tsx` (collapsible Sidebar, Sheet für Mobile, Breadcrumb-Topbar), plus Theme-Toggle im Topbar.
4. **`AdminShellNextElite`** — `AdminShellV3.tsx` wird 1:1 übernommen/umbenannt (bereits fertig aus dem Testlauf), Theme-Toggle ergänzt.
5. **Primitives ergänzen** — zusätzlich zu den bereits vorhandenen (Button, Dialog, DropdownMenu, Avatar, Breadcrumb, ToggleGroup, Sheet, Badge, Input, Label, Tooltip, Separator) werden für Modul 2+ voraussichtlich gebraucht: `Card`, `Table`, `Select`, `Tabs`, `Command` (⌘K, ersetzt bestehende `ui/commandPalette`), `Sonner`/Toast, `Checkbox`, `Textarea`, `Popover`. Werden hier bereits mitgebaut, damit Modul 2 (`platform-admin`) und 3 (`auth`) nicht blockiert sind.
6. **Root-Layout-Umbau** — `src/app/layout.tsx` muss künftig entscheiden, ob `AppShellNextElite`/`AdminShellNextElite` oder noch v1-Shells greifen. Da Migration inkrementell pro Modul läuft, bleibt v1 vorerst Default; einzelne migrierte Routen importieren ihre neue Shell selbst (wie bisher bei `/v3`). **Kein globaler Shell-Switch in diesem Modul** — erst wenn `dashboard` (Modul 4) migriert ist, wird `/dashboard` auf `AppShellNextElite` umgestellt.

## Subdomain-Regressionscheck (nach jedem Schritt)
`admin.localhost:PORT` und `<test-tenant>.localhost:PORT` per `/etc/hosts`-Eintrag oder direktem `Host`-Header-Test (`curl -H "Host: admin.localhost" ...`) gegen den lokalen Dev-Server prüfen — `proxy.ts` bleibt unverändert, das ist ein reiner Funktionscheck, kein Code-Eingriff.

## Risiken
- **Globaler CSS-Import-Konflikt**: Tailwind-Utilities sind rein additiv (keine Kollision), aber zwei global geladene Stylesheets erhöhen die CSS-Bundle-Größe während der Übergangszeit — akzeptiert, da temporär (verschwindet mit v1-Löschung nach Modul `settings`).
- **Command-Palette-Ersatz**: `ui/commandPalette` wird von mehreren Stellen aufgerufen (`AppShellV2` z. B. via `CustomEvent("open-command-palette")`). Die neue `Command`-Primitive muss denselben Event-Contract bedienen, bis alle Aufrufer migriert sind.

## Verifikation
- `npx tsc --noEmit`, `npm run lint`
- Visuelle Abnahme beider neuer Shells durch dich (kein Browser-Automatisierungstool in dieser Session verfügbar)
- Subdomain-Regressionscheck wie oben
- Bestehende `/v3/tenants`-Seiten weiterhin funktionsfähig (nutzen ab jetzt `AdminShellNextElite` statt `AdminShellV3`)
