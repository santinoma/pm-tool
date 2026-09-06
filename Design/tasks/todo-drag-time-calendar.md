# Task List: drag-time-calendar

Ersetzt die einfache Wochenansicht (Klick-auf-Tag-öffnet-Modal) im Zeiterfassungsmodus
"entries" durch einen Stunden-Raster-Kalender mit Drag-to-Create und Drag-to-
Resize/Move für Zeitblöcke.

## Umsetzung
- [x] `src/tenant/timeTracking/calendarGeometry.ts` — reine Geometrie-/Snapping-Funktionen (15-Min-Raster) + Tests (13 Tests)
- [x] `EntriesCalendarClient.tsx` neu geschrieben: 24h-Raster (6–22 Uhr initial sichtbar, scrollbar auf volle 24h), Drag auf leerer Fläche öffnet vorausgefülltes Modal, bestehende Blöcke draggable (verschieben) und resizable (oben/unten)
- [x] `PATCH /api/tenant/time-entries/[id]` erweitert: akzeptiert jetzt `startedAt`/`endedAt`, validiert `end > start`, berechnet `durationMinutes` neu
- [x] Ownership-Check ergänzt (PATCH + DELETE): nur Eintrags-Owner oder Owner/Admin dürfen ändern/löschen — vorher fehlte dieser Check komplett, beim Erweitern des Endpoints um Drag-Updates mit behoben, da sonst jeder eingeloggte Nutzer fremde Zeiteinträge hätte verschieben können
- [x] CSS: `.day-calendar*`/`.time-block*` ersetzen die alten `.week-*`-Klassen (nur in dieser einen Datei verwendet)

## Docker-E2E-Verifikation (2026-08-26)
- Tenant mit `timeTrackingMode=entries`, Projekt/Budget/Section/Assignment angelegt.
- Zeiteintrag erstellt (simuliert Drag-to-Create), per PATCH auf neue Start-/Endzeit
  verschoben (simuliert Drag-to-Move) → persistiert korrekt.
- `endedAt <= startedAt` → 400.
- Zweiter Nutzer (Rolle `member`) versucht fremden Eintrag zu verschieben → 403.
- `/time`-Seite rendert 200.

## Bekannte Grenze
Die eigentliche Maus-Drag-Interaktion (mousedown/mousemove/mouseup-Choreographie,
visuelles Snapping, Scroll-Verhalten) konnte mangels Browser-Zugriff in dieser
Umgebung nicht selbst visuell getestet werden — analog zur bereits dokumentierten
Einschränkung beim Gantt-Chart-Drag in `projects-tasks`. Verifiziert wurde die
zugrunde liegende Geometrie (Unit-Tests) und der komplette Server-Pfad (Docker-E2E).
