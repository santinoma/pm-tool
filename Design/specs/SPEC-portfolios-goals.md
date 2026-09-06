# Spec: portfolios-goals (v2 Modul 14a)

## Objective
Projekte lassen sich zu Portfolios gruppieren; ein Portfolio trägt Ziele (Goals) mit
Fälligkeitsdatum und Status. Der Fortschritt eines Goals wird live aus dem
Task-Abschlussgrad der zugehörigen Projekte berechnet (analog zum bestehenden
`cycleInsights`/`retainer burn`-Muster: kein gespeichertes, potenziell veraltendes
Feld, sondern live berechnet).

## Assumptions (bestätigt)
1. Ein Projekt gehört zu maximal einem Portfolio (`Project.portfolioId`, nullable).
2. Ein Portfolio hat 0..n Goals.
3. Goal-Fortschritt = Anteil erledigter Tasks (Status-Kategorie `done`) an allen
   Tasks aller Projekte des Portfolios, live berechnet — kein manuelles
   Prozent-Feld.
4. Goal-Status (`on_track` / `at_risk` / `off_track` / `done`) wird manuell vom
   Nutzer gesetzt (Ampel-artige Einschätzung, nicht automatisch abgeleitet).
5. Whiteboards sind explizit aus dem v2-Scope gestrichen (Nutzerentscheidung).

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant DB), Vitest.

## Commands
Build: `npm run build`
Test: `npm test`
Migrate: `npx prisma migrate dev --config prisma.tenant.config.ts --name <name>`

## Project Structure
- `src/tenant/portfolios/portfolioProgress.ts` — reine Berechnung
- `src/app/api/tenant/portfolios/route.ts`, `.../[id]/route.ts`
- `src/app/api/tenant/portfolios/[id]/goals/route.ts`, `.../goals/[goalId]/route.ts`
- `src/app/(tenant)/portfolios/page.tsx`, `.../[id]/page.tsx`
- `tests/portfolioProgress.test.ts`, `tests/portfolios.test.ts`

## Code Style
Folgt bestehenden Mustern (z. B. `cycleInsights.ts`, `retainer/burn.ts`) — reine
Funktion nimmt Tasks entgegen, keine DB-Zugriffe.

## Testing Strategy
Vitest Unit-Test für die reine Berechnungsfunktion, Integrationstest über
`provisionTenant()`/`getTenantDbClient()`, Docker-E2E via curl.

## Boundaries
- Always: Fortschritt live berechnen, nicht cachen.
- Ask first: Schema-Änderungen außerhalb dieses Moduls.
- Never: Whiteboards implementieren (explizit gestrichen).

## Success Criteria
- Portfolio anlegen, Projekte zuordnen, Goal anlegen.
- Goal-Fortschritt spiegelt Task-Abschlussgrad der Portfolio-Projekte korrekt wider.
- Docker-E2E grün.
