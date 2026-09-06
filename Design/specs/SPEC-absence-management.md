# Spec: absence-management (v0.2 Modul)

## Objective
Mitarbeitende können Urlaub und Krankheit für einen Zeitraum beantragen. Ein
Admin/Owner genehmigt oder lehnt ab. Nach Genehmigung gilt für jeden Werktag
im Zeitraum die individuelle Soll-Arbeitszeit (`weeklyCapacityHours / 5`) als
erfüllt, sodass keine Minusstunden entstehen. Teil des Reiters "Zeiterfassung"
(`/time/absence`, bisher Platzhalter aus time-tracking-v2).

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant-DB), bestehende Testinfrastruktur
(Vitest + Docker-E2E via curl).

## Commands
Build: `npm run build`
Test: `npm test`
Dev: `npm run dev` (bzw. `docker compose up -d --build app`)

## Project Structure
```
prisma/tenant/schema.prisma        → AbsenceRequest-Modell
src/tenant/absence/                → reine Logik (Werktage zählen, Soll-Stunden je Tag)
src/app/api/tenant/absence-requests/route.ts        → GET/POST (eigene Anträge, Antrag stellen)
src/app/api/tenant/absence-requests/[id]/route.ts   → PATCH (genehmigen/ablehnen)
src/app/(tenant)/time/absence/page.tsx + AbsenceClient.tsx → UI
tests/                              → Unit- und Integrationstests
```

## Code Style
Bestehende Konventionen: deutschsprachige UI-Texte, Field-Atlas-CSS-Klassen
(`.container`, `.btn`, `.input`, `.select`, `.table`), Server-Components für
Datenladen + `"use client"`-Komponenten für Interaktion, Rollen-Guard via
`canManageMembers(role)`.

## Testing Strategy
Vitest für reine Logik (Werktage-Zähler) und für den kompletten
Request→Approve-Flow (Datenebene, analog `tests/timeTrackingV2.test.ts`).
Docker-E2E via curl: Antrag stellen (member), 403 bei Genehmigungsversuch
durch member, Genehmigung durch owner, Status-Wechsel sichtbar.

## Boundaries
- Always: bestehende Muster (Rollen-Guard, Transaktionen bei Statuswechsel) wiederverwenden.
- Ask first: Änderungen an bestehenden Zeiterfassungs-Modellen außerhalb des neuen `AbsenceRequest`-Modells.
- Never: Feiertagskalender oder automatische Genehmigung einführen (außerhalb Scope v0.2).

## Success Criteria
- Mitarbeitende können einen Antrag (Typ, Start-/Enddatum, Notiz) über `/time/absence` stellen.
- Eigene Anträge inkl. Status werden angezeigt.
- Admin/Owner sieht eine Queue aller offenen Anträge im Tenant und kann genehmigen/ablehnen.
- Bei Genehmigung wird der Soll-Erfüllungs-Datensatz für jeden Werktag im Zeitraum angelegt (Basis: `weeklyCapacityHours / 5`).
- Nicht-Admin erhält 403 bei Genehmigungsversuch.
- `npm test` und `npm run build` grün; Docker-E2E verifiziert.

## Open Questions
Keine — Annahmen wurden bestätigt.
