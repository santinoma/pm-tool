# Spec: retainer-tracking (v2 Modul 5)

## Objective
Ein Budget kann als wiederkehrender Retainer markiert werden (monatlich
oder wöchentlich). Die Section-Menge gilt dann als Kontingent pro Periode;
die Budget-Detailseite zeigt einen Live-Burn (verbraucht in der laufenden
Periode, aus Zeiteinträgen berechnet, setzt sich automatisch jede Periode
zurück) statt des lebenslang akkumulierenden `budgetUsed`.

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `docker compose up -d --build app`

## Project Structure
```
prisma/tenant/schema.prisma                 → Budget.isRetainer, Budget.recurrenceInterval
src/tenant/retainer/period.ts               → reine Perioden-Grenzen-Berechnung (Monat/Woche)
src/tenant/retainer/burn.ts                 → reine Burn-Berechnung je Section für eine Periode
src/app/api/tenant/budgets/route.ts         → POST erweitert um isRetainer/recurrenceInterval
src/app/(tenant)/financials/[projectId]/[budgetId]/  → UI-Erweiterung: Live-Burn-Panel
tests/                                       → Unit-Tests
```

## Code Style
Bestehende Muster: Field-Atlas-CSS (`.scale-bar` für Burn-Down-Balken
wiederverwenden), `canManageMembers`-Guard bereits vorhanden bei
Budget-Erstellung.

## Testing Strategy
Vitest für die reinen Perioden- und Burn-Funktionen (Monatsgrenzen,
Wochengrenzen, Burn-Berechnung aus Zeiteintrag-Rohdaten). Docker-E2E:
Retainer-Budget anlegen, Zeiteintrag im aktuellen Monat buchen, Burn-Anzeige
prüfen.

## Boundaries
- Always: Live-Burn ausschließlich aus Zeiteinträgen der laufenden Periode
  berechnen, nie aus `budgetUsed`.
- Ask first: Automatische Perioden-Historie/Archivierung vergangener
  Perioden — außerhalb des v1-Scopes, nur die laufende Periode wird gezeigt.
- Never: Bestehende Nicht-Retainer-Budgets in ihrem Verhalten verändern.

## Success Criteria
- Beim Anlegen eines Budgets ist "Retainer" (aus/monatlich/wöchentlich)
  wählbar.
- Ein Retainer-Budget zeigt je Section: Kontingent der laufenden Periode,
  verbraucht (nur Zeiteinträge dieser Periode), verbleibend, Nutzung-%.
- Die Anzeige setzt sich in der nächsten Periode automatisch zurück (rein
  aus dem Datumsfenster berechnet, kein manueller Reset nötig).
- Nicht-Retainer-Budgets verhalten sich unverändert.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt.
