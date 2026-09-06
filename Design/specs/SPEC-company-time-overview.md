# Spec: company-time-overview (v0.2 Modul)

## Objective
Admins/Owner sehen auf `/time/company` eine Wochenübersicht: pro aktivem
Mitglied die gebuchten Stunden je Wochentag (Mo–So) plus Wochensumme. Ein
genehmigter Urlaubs-/Krankheitstag wird markiert und zählt als erfülltes
Soll. Im Zeiteintragungs-Modus lässt sich eine Tageszelle aufklappen, um die
einzelnen Einträge (Zeitspanne, Service, Beschreibung) zu sehen — ohne
Stundensatz. Ersetzt den Platzhalter aus time-tracking-v2.

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
src/tenant/companyTime/weekSummary.ts          → reine Aggregationslogik
src/app/(tenant)/time/company/page.tsx + CompanyTimeClient.tsx → UI
tests/                                          → Unit-Tests für die Aggregation
```

## Code Style
Field-Atlas-CSS-Klassen (`.table`, `.week-*` aus time-tracking-v2 wo
passend), deutschsprachige UI-Texte, `canManageMembers` bereits serverseitig
in `src/app/(tenant)/time/company/page.tsx` durchgesetzt (siehe
time-tracking-v2).

## Testing Strategy
Vitest für die reine Aggregationsfunktion (Stunden pro User/Tag aus
TimeEntry-Rohdaten berechnen, inkl. Berücksichtigung genehmigter Absenzen).
Docker-E2E via curl/HTML-Grep: Tabelle zeigt korrekte Summen, Absenz-Badge
erscheint, Zugriff für member weiterhin blockiert (bereits getestet in
time-tracking-v2).

## Boundaries
- Always: bestehende `AbsenceRequest`- und `TimeEntry`-Modelle wiederverwenden, keine neuen Tabellen für reine Aggregationen.
- Ask first: Änderungen an der Wochenkalender-Logik aus time-tracking-v2.
- Never: Stundensatz/`amount` einzelner Einträge in der Company-Time-Ansicht anzeigen.

## Success Criteria
- Tabelle zeigt je Mitglied und Wochentag die Summe gebuchter Stunden sowie eine Wochensumme.
- Wochennavigation (vorherige/nächste Woche) funktioniert.
- Ein genehmigter Absenztag ist visuell markiert.
- Im Zeiteintragungs-Modus öffnet ein Klick auf eine Tageszelle mit Einträgen eine Detailansicht (Service, Zeitspanne, Beschreibung), niemals den Stundensatz.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt.
