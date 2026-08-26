# Spec: settings-restructure (v0.2 Modul)

## Objective
`/settings` wird von einer flachen Liste zu drei benannten Gruppen (My
Settings, Organization, Users) umgebaut, wie im ursprünglichen v0.2-Bundle
beschrieben. Tiefere Punkte je Gruppe sind für v0.2 bewusst
Platzhalter-Seiten (bestätigt: "Nur Platzhalter-Seiten"), mit Ausnahme von
Account (zeigt echte Nutzerdaten) und den bereits funktionsfähigen Seiten
(General/Organisation, Zeiterfassung, Webhooks, Mitglieder), die unverändert
weiterverlinkt werden.

## Tech Stack
Next.js App Router, TypeScript.

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
src/app/(tenant)/settings/page.tsx                         → neuer 3-Gruppen-Hub
src/app/(tenant)/settings/account/page.tsx                 → My Settings (echte Daten)
src/app/(tenant)/settings/notifications/page.tsx           → My Settings (Platzhalter)
src/app/(tenant)/settings/security/page.tsx                → My Settings (Platzhalter)
src/app/(tenant)/settings/appearance/page.tsx               → My Settings (Platzhalter)
src/app/(tenant)/settings/organization/service-types/page.tsx  → Platzhalter
src/app/(tenant)/settings/organization/recycle-bin/page.tsx    → Platzhalter
src/app/(tenant)/settings/organization/workflows/page.tsx      → Platzhalter
src/app/(tenant)/settings/organization/automations/page.tsx    → Platzhalter
src/app/(tenant)/settings/users/employee-fields/page.tsx       → Platzhalter
src/ui/shell/AppShell.tsx                                   → "Zeiterfassung"-Link ergänzen
```

## Code Style
Bestehendes Muster: Server-Component lädt `getTenantContext()`, redirect bei
fehlendem User, Field-Atlas-CSS (`.container`, `.settings-list` o.ä.).
Platzhalter-Seiten folgen dem bereits etablierten Muster aus
`/time/absence`/`/time/company` (Überschrift + `text-muted`-Hinweistext).

## Testing Strategy
Keine neue reine Logik in diesem Modul (nur Navigation/Platzhalter) — Build
+ Docker-HTML-Grep genügt als Verifikation, kein neuer Vitest-Test nötig.

## Boundaries
- Always: bestehende funktionsfähige Settings-Seiten (Organisation,
  Zeiterfassung, Webhooks, Mitglieder) unverändert lassen, nur neu einsortieren/verlinken.
- Ask first: neue Datenmodelle für Service-Types/Workflows/Automations (das ist Scope für spätere Module).
- Never: Platzhalter-Seiten mit Fake-Daten befüllen, die einen fertigen Funktionsumfang vortäuschen.

## Success Criteria
- `/settings` zeigt drei klar benannte Gruppen mit den Beschreibungstexten aus der Anfrage.
- Alle neuen Unterseiten sind erreichbar und rendern ohne Fehler.
- Account zeigt Name/E-Mail des eingeloggten Users.
- "Zeiterfassung" ist in der linken Hauptnavigation sichtbar und verlinkt `/time`.
- `npm test` und `npm run build` grün; Docker-Verifikation.

## Open Questions
Keine — Annahmen wurden bestätigt.
