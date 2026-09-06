# Spec: hill-charts

## Objective
Basecamp-Style Hill Charts: qualitativer Fortschritt eines Tasks ("noch am Rausfinden" vs. "läuft, wird umgesetzt") statt nur %-Fertig, dargestellt als Punkt auf einer Hügelkurve, verschiebbar per Drag.

**Nutzer:** Alle Tenant-Nutzer — sehen und aktualisieren die Hill-Position ihrer Tasks pro Projekt.

**Erfolg:** `/projects/[id]/hill-chart` zeigt alle aktiven (nicht `done`, nicht Triage) Tasks mit gesetzter `hillPosition` als Punkte auf einer Hügelkurve; Ziehen eines Punkts aktualisiert die Position persistent.

## Tech Stack
Next.js (App Router) + TypeScript + PostgreSQL + Prisma — unverändert. Native Maus-Events fürs Dragging, keine externe Chart-Bibliothek (analog zum bestehenden Gantt).

## Project Structure
```
prisma/tenant/schema.prisma                     → Task.hillPosition
src/tenant/hillChart/geometry.ts                → reine Funktion: hillPosition (0-100) → {x, y}-Koordinaten auf der Hügelkurve
src/app/(tenant)/projects/[id]/hill-chart/page.tsx
src/app/(tenant)/projects/[id]/hill-chart/HillChartClient.tsx  → SVG-Hügel + Drag-Logik
tests/hillChartGeometry.test.ts
```
Die bestehende `PATCH /api/tenant/tasks/[id]`-Route wird um `hillPosition` erweitert (gleiches Muster wie `estimatedHours`/`dueDate`), kein neuer Endpunkt nötig.

## Code Style
Reine Geometrie-Funktion, analog zu `computeBarPosition` aus dem Gantt-Modul:
```ts
export function hillPositionToCoords(position: number, width: number, height: number): { x: number; y: number } {
  const x = (position / 100) * width;
  const normalized = position / 50 - 1; // -1 (links) .. 0 (Gipfel) .. 1 (rechts)
  const y = height - (1 - normalized * normalized) * height;
  return { x, y };
}
```

## Testing Strategy
Vitest. `hillPositionToCoords` ist eine reine Funktion, direkt unit-getestet (Startpunkt 0, Gipfel 50, Endpunkt 100, Monotonie der Höhe auf beiden Hügelseiten). Drag-Interaktion und visuelle Darstellung sind nicht per Vitest testbar (kein Browser) — wie beim Gantt wird das per Docker/curl auf API-Ebene (PATCH persistiert korrekt) und ggf. manuell im Browser verifiziert; visuelles Aussehen wird dem Menschen zur eigenen Prüfung überlassen.

## Boundaries
- **Always:** Tasks ohne gesetzte `hillPosition` erscheinen nicht auf dem Chart (kein erzwungener Default) — ein Task "betritt" den Hill Chart erst, wenn jemand ihn bewusst dort platziert.
- **Ask first:** Eine übergreifende "Scope"-Gruppierung oberhalb von Task (wie in echtem Basecamp) — bewusst nicht in v1, siehe Annahme 1.
- **Never:** Keine automatische Positionsänderung durch Status-Wechsel — Hill-Position ist eine eigenständige, subjektive Einschätzung, kein abgeleiteter Wert.

## Success Criteria
- Task mit `hillPosition: 0` liegt am linken Fußpunkt, `hillPosition: 50` am Gipfel, `hillPosition: 100` am rechten Fußpunkt der Kurve.
- `done`- und Triage-Tasks werden nicht auf dem Chart angezeigt, auch wenn sie eine `hillPosition` haben.
- `PATCH /api/tenant/tasks/[id]` mit `hillPosition` persistiert den Wert.

## Open Questions
Keine.
