# Spec: time-tracking-v2

## Objective
`/time` wird zu einer Tab-Seite: **Meine Zeit** | **Book Absence** | **Company Time**. Dieses Modul baut **Meine Zeit** vollständig; die anderen beiden Tabs sind sichtbare, aber als "folgt in Kürze" markierte Platzhalter (eigene Module direkt danach). Ein neuer Tenant-Modus (`timeTrackingMode`) entscheidet, ob "Meine Zeit" die bestehende Timer-Oberfläche zeigt oder eine neue Kalender-Oberfläche mit Zeiteinträgen, die direkt einem Budget-Service zugeordnet sind und dessen `budgetUsed` erhöhen.

**Nutzer:** Alle Tenant-Nutzer.

**Erfolg:** Im Modus "entries" sieht man einen Wochenkalender; Linksklick auf einen Slot öffnet "New time entry" mit vorbefülltem, editierbarem Datum, einer Service-Auswahl (nur Sections, denen man zugeordnet ist), Start/Ende in 15-Minuten-Schritten, einer Notiz und Speichern-Button. Nach dem Speichern ist der Eintrag im Kalender sichtbar, und der zugehörige `BudgetSection.budgetUsed` ist um die Kosten (Stunden × Section-Price) erhöht — der Satz selbst wird im Zeiteintrag nie angezeigt.

## Tech Stack
Next.js (App Router) + TypeScript + PostgreSQL + Prisma — unverändert.

## Project Structure
```
prisma/tenant/schema.prisma                 → TenantSettings.timeTrackingMode (enum), TimeEntry.budgetSectionId + amount
src/tenant/timeTracking/entryCost.ts        → reine Funktion: Kosten aus Dauer + Satz
src/app/api/tenant/time-entries/route.ts    → POST erweitert um budgetSectionId-Pfad (erhöht budgetUsed atomar)
src/app/api/tenant/tenant-settings/route.ts → PATCH erweitert um timeTrackingMode
src/app/(tenant)/time/page.tsx              → Tab-Shell (Meine Zeit / Book Absence / Company Time)
src/app/(tenant)/time/MeineZeitTab.tsx      → wählt Timer- oder Kalender-Ansicht je nach Modus
src/app/(tenant)/time/TimeEntryCalendar.tsx → Wochenkalender, Klick öffnet Modal
src/app/(tenant)/time/NewTimeEntryModal.tsx → Formular (Datum, Service, Start/Ende, Notiz, Speichern)
src/app/(tenant)/settings/organization/...  → Modus-Auswahl (Timer / Zeiteinträge)
tests/entryCost.test.ts
tests/timeTrackingV2.test.ts                → Integrationstest (budgetUsed-Erhöhung, Zugriffsschutz)
```

## Code Style
Reine Kostenberechnung:
```ts
export function computeEntryCost(durationMinutes: number, hourlyRate: number): number {
  return (durationMinutes / 60) * hourlyRate;
}
```

## Testing Strategy
Vitest. `computeEntryCost` ist eine reine Funktion, direkt unit-getestet. Die DB-Logik (Zeiteintrag anlegen erhöht `budgetSectionId`s `budgetUsed` korrekt; nur zugeordnete Personen dürfen gegen eine Section buchen) wird als Integrationstest gegen eine echte, per `provisionTenant()` erzeugte Tenant-DB getestet. Kalender/Modal werden zusätzlich manuell via Docker/curl (auf API-Ebene) verifiziert; das visuelle Kalender-Raster selbst kann mangels Browser-Zugriff nicht visuell geprüft werden.

## Boundaries
- **Always:** Der Stundensatz einer Section wird im Zeiteintrag selbst nie angezeigt — nur die Kosten fließen intern ins Budget.
- **Ask first:** Bearbeiten/Löschen bestehender Zeiteinträge im Kalender — in diesem Modul nicht enthalten (nur Anlegen); `budgetUsed` wird beim Anlegen einmalig erhöht, nicht bei nachträglicher Änderung zurückgerechnet.
- **Never:** Ein Zeiteintrag kann nicht gegen eine Section gebucht werden, der die buchende Person nicht zugeordnet ist.

## Success Criteria
- `timeTrackingMode: "timer"` (Default) → "Meine Zeit" zeigt unverändert die bestehende Timer-Oberfläche.
- `timeTrackingMode: "entries"` → "Meine Zeit" zeigt den Wochenkalender.
- Klick auf einen Kalender-Slot öffnet das Modal mit vorbefülltem Datum.
- Nur Sections, denen der Nutzer zugeordnet ist, erscheinen in der Service-Auswahl.
- Nach dem Speichern: `TimeEntry.budgetSectionId` gesetzt, `durationMinutes` korrekt aus Start/Ende berechnet, `BudgetSection.budgetUsed` um `Stunden × Price` erhöht.
- Ein Versuch, gegen eine nicht zugeordnete Section zu buchen, wird abgelehnt.

## Open Questions
Keine — Annahmen (Kalender-UI, Service-Dropdown aus Budget-Sections, 15-Minuten-Schritte, Budget-Kopplung sofort) vom Menschen bestätigt.
