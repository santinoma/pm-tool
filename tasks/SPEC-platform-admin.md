# Spec: `platform-admin` (Next-Elite-Migration, Modul 2/15)

## Objective
Next-Elite-Version (`/v3/tenants`) wird die einzige Platform-Admin-Oberfläche. v1 (`(platform-admin)/tenants/**`) und v2 (`(platform-admin)/v2/**`) werden entfernt. Kein neuer Funktionsumfang — reine Konsolidierung dessen, was in Modul 1 bereits gebaut/getestet wurde.

## Bestandsaufnahme
- v1: `tenants/page.tsx`, `tenants/new/page.tsx`, `DeleteTenantButton.tsx`, `ToggleTenantStatusButton.tsx` — nutzt `ui/shell/AdminShell.tsx` (Apple-HIG)
- v2: `v2/**` — nutzt `ui/v2/AdminShellV2.tsx` (admin-exklusiv) + `ui/v2/theme.css`/`components.tsx` (**geteilt** mit `(tenant)/v2/**`, NICHT löschen)
- v3: `v3/**` — bereits fertig, nutzt `AdminShellNextElite`

## Plan
1. `v3/tenants/**`-Dateien nach `(platform-admin)/tenants/**` verschieben (ersetzt v1), `v3/layout.tsx` nach `(platform-admin)/layout.tsx`
2. Interne Links `/v3/tenants` → `/tenants` in den verschobenen Dateien anpassen
3. Alte v1-Dateien (`DeleteTenantButton.tsx`, `ToggleTenantStatusButton.tsx`, alte `page.tsx`-Varianten) löschen
4. `(platform-admin)/v2/**` komplett löschen + `ui/v2/AdminShellV2.tsx` löschen (admin-exklusiv, keine anderen Importer)
5. `ui/v2/theme.css`/`ui/v2/components.tsx`/`ui/v2/AppShellV2.tsx` **bleiben** (von `(tenant)/v2/**` weiter genutzt, Modul `dashboard`/`projects` räumt das auf)
6. `AdminShellNextElite`s "Klassische Ansicht"-Link (aktuell `/tenants`, zeigt auf sich selbst nach der Umstellung) entfernen — es gibt keine "klassische" Alternative mehr
7. Verifikation: `/tenants`, `/tenants/new`, `admin.localhost` Regressionscheck

## Boundaries
Wie Modul 1: v1/v2 erst löschen, nachdem der Ersatz lokal verifiziert lief. Kein Eingriff in `proxy.ts`/API-Routen.
