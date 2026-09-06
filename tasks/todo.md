# Tasks: `design-foundation` (Next-Elite-Migration, Modul 1/15)

- [x] Task: `useTheme`-Hook + `ThemeToggle`-Komponente (Sun/Moon, `localStorage`, setzt `.se-scope.dark`)
  - Files: `src/ui/shadcn/lib/theme-provider.tsx`, `src/ui/shadcn/components/theme-toggle.tsx`

- [x] Task: Tailwind/`.se-scope` app-weit statt nur `(platform-admin)/v3` einbinden
  - Files: `src/app/layout.tsx` (Tailwind-Import), `src/app/(platform-admin)/v3/layout.tsx` (nutzt jetzt `ThemeProvider`)
  - `.se-scope` bleibt bewusst NICHT am Root-Wrapper — nur migrierte Shells (`AdminShellNextElite`, künftig `AppShellNextElite`) wrappen sich selbst darin, damit v1-Seiten (`globals.css`) unangetastet bleiben

- [x] Task: Primitives ergänzen (Card, Table, Select, Tabs, Checkbox, Textarea, Popover)
  - Files: `src/ui/shadcn/components/{card,table,select,tabs,checkbox,textarea,popover}.tsx`
  - **Zurückgestellt:** Command (⌘K-Palette) und Toast/Sonner — bräuchten neue Abhängigkeiten (`cmdk`, `sonner`), kein Modul 2/3 blockiert aktuell darauf. Wird nachgeholt, sobald ein Modul sie wirklich braucht (voraussichtlich `projects`).

- [x] Task: `AdminShellV3.tsx` → `AdminShellNextElite.tsx`
  - Files: `src/ui/nextelite/AdminShellNextElite.tsx` (neu), `AdminShellV3.tsx` gelöscht, Importe in `(platform-admin)/v3/tenants/**` angepasst, Theme-Toggle in Topbar ergänzt

- [x] Task: `AppShellNextElite.tsx` bauen
  - Files: `src/ui/nextelite/AppShellNextElite.tsx` (neu)
  - Navigationsstruktur inhaltlich 1:1 aus `ui/shell/AppShell.tsx` übernommen: Feature-Gating (`portfolios_goals`, `budgets_financials`), Manager-only Zeiterfassungs-Items, dynamische Favoriten/Financials-Budgets (gleiche API-Routen), Such-Trigger (identischer `open-command-palette`-Event), Konto-Dropdown inkl. Logout
  - Noch nicht live in einer Route verlinkt (folgt in Modul `dashboard`)

- [x] Task: Subdomain-Regressionscheck
  - `admin.localhost` → 200, unbekannte Subdomain → 404, `demoo.localhost` (echter Test-Tenant) durchläuft `proxy.ts` korrekt
  - Hinweis: `demoo.localhost/login` liefert 500 — vorbestehende, migrationsunabhängige Ursache (Tenant-`dbUrl` zeigt auf Docker-internen Host `postgres`, außerhalb Docker Compose nicht erreichbar)

- [x] Task: Spec/Capability-Map-Status aktualisieren
  - Files: `NEXTELITE-MIGRATION-CAPABILITY-MAP.md`

## Modul 1 abgeschlossen
`npx tsc --noEmit` und `npm run lint` sauber über alle geänderten/neuen Dateien. Kein Browser-Automatisierungstool in dieser Session verfügbar — visuelle Abnahme durch dich steht noch aus (siehe Verifikations-Hinweise im Chat).
