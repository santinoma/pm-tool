# Spec: time-tracking

Modul aus `CAPABILITY-MAP.md`. Baut auf `projects-tasks` auf.

## Objective
Timer + manuelle Zeiteinträge, verknüpft mit Tasks (Standard) oder optional direkt mit Projekten (pro Tenant konfigurierbar). Grundlage für `budgeting-basic` (Soll-/Ist-Vergleich) und spätere Rechnungsstellung.

**Nutzer:** Alle Mitglieder einer Organisation.

**Erfolg:** Ein Nutzer startet einen Timer an einem Task, stoppt ihn später — die Zeit ist gespeichert. Alternativ trägt er Zeit manuell mit Dauer + Datum ein. Ist projektweite Zeitbuchung aktiviert, kann er Zeit auch ohne konkreten Task direkt am Projekt buchen (z.B. für allgemeine Projektarbeit).

## Datenmodell (Tenant-Schema, Ergänzung)
```prisma
model TenantSettings {
  id                           String  @id @default(uuid())
  allowProjectLevelTimeEntries Boolean @default(false)
  createdAt                    DateTime @default(now())
  updatedAt                    DateTime @updatedAt
}
// Genau eine Zeile pro Tenant-DB (Singleton), Zugriff über getOrCreateTenantSettings().
// Wird von admin-settings (späteres Modul) um weitere Einstellungen erweitert.

model TimeEntry {
  id              String    @id @default(uuid())
  user            User      @relation(fields: [userId], references: [id])
  userId          String
  task            Task?     @relation(fields: [taskId], references: [id])
  taskId          String?
  project         Project?  @relation(fields: [projectId], references: [id])
  projectId       String?
  description     String?
  startedAt       DateTime? // gesetzt bei Timer-Einträgen, null bei rein manuellen Einträgen
  endedAt         DateTime? // null während ein Timer läuft
  durationMinutes Int?      // erst final, wenn Timer gestoppt oder manueller Eintrag erstellt wurde
  createdAt       DateTime  @default(now())
}
```
- **Invariante (App-Ebene, wie bei anderen Modulen kein DB-Constraint):** genau eines von `taskId`/`projectId` muss gesetzt sein; `projectId` ohne `taskId` ist nur zulässig, wenn `TenantSettings.allowProjectLevelTimeEntries = true`
- **Laufender Timer:** `endedAt: null`, `durationMinutes: null`. Pro Nutzer maximal ein laufender Timer gleichzeitig — Start eines neuen Timers stoppt automatisch den alten (mit dem bis dahin vergangenen Zeitraum)

## Verhalten
- **Timer starten:** an einem Task (oder Projekt, falls erlaubt) — falls der Nutzer bereits einen laufenden Timer hat, wird dieser zuerst gestoppt (Dauer berechnet, `endedAt` gesetzt)
- **Timer stoppen:** setzt `endedAt`, berechnet `durationMinutes` aus `endedAt - startedAt`
- **Manueller Eintrag:** Datum + Dauer (Stunden/Minuten) + optionale Beschreibung, kein `startedAt`/`endedAt`
- **Aggregation:** Summe der `durationMinutes` pro Task (direkt zugeordnete Einträge) und pro Projekt (direkt zugeordnete + Summe über alle Tasks des Projekts) — reine Funktion, unit-testbar
- **Tenant-Einstellung:** Umschalter "Zeitbuchung auch direkt auf Projektebene erlauben" (Default: aus) — Ort dafür ist vorerst eine einfache Einstellungsseite, wird später von `admin-settings` vereinheitlicht

## Project Structure (Ergänzung)
```
prisma/tenant/schema.prisma        → um TenantSettings, TimeEntry erweitert
src/tenant/
  timeTracking/
    duration.ts                     → reine Funktionen: computeDurationMinutes(start, end), aggregateByTask(), aggregateByProject()
    tenantSettings.ts                 → getOrCreateTenantSettings(tenantDb)
  app/(tenant)/
    time/
      page.tsx                          → eigene Zeiterfassungs-Übersicht (meine Einträge, laufender Timer prominent)
    projects/[id]/settings/
      time-tracking/page.tsx             → Tenant-Einstellung (Projektebene-Buchung an/aus)
    api/tenant/
      time-entries/route.ts               → POST (manueller Eintrag), GET (Liste mit Filtern)
      time-entries/[id]/route.ts           → PATCH/DELETE
      timer/start/route.ts                  → stoppt ggf. laufenden Timer, startet neuen
      timer/stop/route.ts                    → stoppt aktuellen Timer
      tenant-settings/route.ts                → GET/PATCH
```

## Code Style
```typescript
// src/tenant/timeTracking/duration.ts
export function computeDurationMinutes(startedAt: Date, endedAt: Date): number {
  return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
}
```

## Testing Strategy
- Vitest wie im Rest des Projekts
- Unit-Tests: `computeDurationMinutes`, Aggregationsfunktionen, Validierung der taskId/projectId-Invariante
- Integrationstests: Timer-Start stoppt vorherigen laufenden Timer automatisch; manueller Eintrag ohne `taskId` wird abgelehnt, wenn `allowProjectLevelTimeEntries = false`

## Boundaries
- **Always:** Beim Start eines neuen Timers wird ein evtl. laufender Timer desselben Nutzers immer zuerst korrekt gestoppt — nie zwei laufende Timer gleichzeitig für eine Person
- **Ask first:** Rundung von Zeiteinträgen (z.B. auf 15-Minuten-Blöcke) — nicht in v1, exakte Minuten
- **Never:** Zeiteintrag ohne jede Zuordnung (weder Task noch Projekt) zulassen

## Success Criteria
- [ ] Timer starten/stoppen funktioniert, Dauer wird korrekt berechnet
- [ ] Start eines zweiten Timers stoppt den ersten automatisch
- [ ] Manueller Eintrag mit Dauer + Datum funktioniert
- [ ] Projektebene-Zeitbuchung ist standardmäßig deaktiviert und wird bei Deaktivierung serverseitig abgelehnt, nicht nur im UI versteckt
- [ ] Aggregation pro Task und pro Projekt liefert korrekte Summen
- [ ] `npm run build` und `npm test` grün

## Open Questions
- Keine blockierenden
