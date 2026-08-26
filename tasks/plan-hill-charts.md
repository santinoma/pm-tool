# Implementation Plan: hill-charts

## Overview
Ein Feld (`Task.hillPosition`), eine reine Geometrie-Funktion, eine Erweiterung der bestehenden Task-PATCH-Route, eine neue Projekt-Unteransicht mit SVG-Hügel und Drag-Interaktion.

## Architecture Decisions
- Kein neues Scope-Modell — Task ist die Einheit, die auf dem Hill Chart erscheint (siehe Spec, Annahme 1).
- Drag-Mechanik wird nach dem bestehenden Gantt-Muster (native Mouse-Events, kein externes Drag-&-Drop-Paket) implementiert.
- Die Y-Koordinate der Hügelkurve wird über eine einfache Parabel-Formel berechnet, keine Bezier-Bibliothek nötig.

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: Tenant-Schema erweitern (`Task.hillPosition`)

### Checkpoint: Schema
- [ ] Migration angewendet, `npm run build` grün

### Phase 2: Reine Logik
- [ ] Task 2: `hillPositionToCoords()` in `src/tenant/hillChart/geometry.ts` + Unit-Tests

### Phase 3: API + UI
- [ ] Task 3: Task-PATCH-Route um `hillPosition` erweitern
- [ ] Task 4: `/projects/[id]/hill-chart/page.tsx` + `HillChartClient.tsx` (SVG-Hügel, Drag, Ausschluss done/Triage)

### Checkpoint: Abschluss
- [ ] `npm test` und `npm run build` grün
- [ ] Docker/curl: `hillPosition` persistiert korrekt, done/Triage-Ausschluss korrekt
- [ ] Review mit Mensch vor Abschluss des Moduls (Drag-UX mangels Browser-Zugriff nicht selbst visuell testbar — an den Menschen delegiert)

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Drag-UX kann nicht selbst visuell verifiziert werden (kein Browser-Zugriff) | Mittel | Wie beim Gantt: API-Ebene + Geometrie-Funktion testen, visuelle Prüfung explizit an den Menschen delegieren |

## Open Questions
Keine.
