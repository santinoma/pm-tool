# Spec: `auth` (Next-Elite-Migration, Modul 3/15)

## Objective
Login, Accept-Invite und die öffentlichen Shared-Link-Seiten (Shared View, Shared Wiki-Doc) auf Next-Elite umstellen. Diese 4 Seiten haben in v1 kein gemeinsames Shell-Component (nur `.auth-page`/`.auth-card`/`.container`-Klassen direkt inline) — ich baue eine kleine `AuthCard`-Komponente für Login/Accept-Invite und einen einfachen zentrierten Content-Rahmen für die Shared-Link-Seiten.

## Scoping-Lösung
`(tenant)/layout.tsx` wrapped **alle** Tenant-Routen (Dashboard, Projekte, etc. — noch nicht migriert) und darf nicht global `.se-scope` bekommen. Neue Route-Gruppe `(tenant)/(auth)/` (URL-neutral) mit eigenem `layout.tsx` (`ThemeProvider`), enthält `login`, `accept-invite`, `shared`, `shared-doc`.

## Plan
1. `AuthCard`-Komponente (`src/ui/nextelite/AuthCard.tsx`): zentrierte Karte, Wordmark, Titel, Beschreibung, Children-Slot für das Formular
2. Routen nach `(tenant)/(auth)/**` verschieben, `layout.tsx` mit `ThemeProvider` ergänzen
3. `login/LoginPageClient.tsx`, `accept-invite/[token]/page.tsx`: Formulare auf shadcn-Primitives (Input, Label, Button) + `AuthCard` umstellen — Logik (SSO-Redirect, 2FA-Zwischenschritt, Fetch-Calls) 1:1 unverändert
4. `shared/[token]/page.tsx`, `shared-doc/[token]/page.tsx`: einfacher zentrierter Rahmen (Card + Table/Prose), Server-Logik unverändert
5. Verifikation: alle 4 Routen laden, Subdomain-Regressionscheck

## Boundaries
Keine Änderung an `/api/tenant/login`, `/api/tenant/login/2fa`, `/api/tenant/invites/*`, `isSharedViewValid`, `isSharedWikiLinkValid`, `renderMarkdownSafe` — rein UI-seitig. `proxy.ts`s `CLIENT_ALLOWED_PREFIXES`/`TWO_FA_SETUP_ALLOWED_PREFIXES` bleiben unverändert (Pfade `/login`, `/accept-invite`, `/shared`, `/shared-doc` ändern sich nicht).
