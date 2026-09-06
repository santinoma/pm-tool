# Implementation Plan: collaboration

## Overview
Kommentare/Mentions, Datei-Anhänge, Wiki-Seiten. Da bisher keine Task-Detail-Seite existiert (die Ansichten aus `projects-tasks` zeigen nur Listen/Board/Kalender/Gantt), wird diese hier ergänzt — sie ist der natürliche Ort für Kommentare/Anhänge.

## Architecture Decisions
- **Task-Detail-Seite als neuer, in diesem Modul ergänzter Baustein**, nicht nachträglich in `projects-tasks` — Kommentare/Anhänge brauchen einen Anzeigeort, der vorher fehlte
- **Upload-Verzeichnis über `UPLOADS_DIR`-Env-Variable**, lokal im Docker-Volume — Pfad-Konstruktion (`buildStoragePath`) von echtem Dateisystemzugriff getrennt, damit sie ohne echtes I/O testbar ist
- **Markdown-Rendering mit `marked` + Sanitizing (`isomorphic-dompurify`)** — neue Abhängigkeiten, serverseitig gerendert

## Task List

### Phase 1: Datenmodell
- [ ] Task 1: `Comment`, `Mention`, `Attachment`, `WikiPage` ins Tenant-Schema + Migration

### Phase 2: Reine Logik
- [ ] Task 2: `mentions.ts` (`extractMentionedEmails`), `attachmentStorage.ts` (`buildStoragePath`, reine Pfad-Logik)

### Checkpoint: Logik-Grundlagen
- [ ] Unit-Tests grün, `npm run build` grün

### Phase 3: Task-Detail-Seite
- [ ] Task 3: `projects/[id]/tasks/[taskId]/page.tsx` — Titel, Beschreibung, Status, Assignee, Custom Fields, Abhängigkeiten (read-only Anzeige der in `projects-tasks` gebauten Daten)

### Phase 4: Kommentare
- [ ] Task 4: Kommentare API + Anzeige/Formular auf der Task-Detail-Seite (inkl. Mention-Erkennung)

### Phase 5: Datei-Anhänge
- [ ] Task 5: Upload/Download-API + Anzeige auf der Task-Detail-Seite

### Checkpoint: Task-Detail voll funktionsfähig
- [ ] Manuell/E2E via Docker: Kommentar mit Mention, Datei-Upload/-Download
- [ ] Review mit Mensch

### Phase 6: Wiki
- [ ] Task 6: Wiki-CRUD-API + Seiten (Liste, Anlegen, Anzeigen/Bearbeiten mit sicherem Markdown-Rendering)

## Checkpoint: Abschluss
- [ ] Alle Success-Criteria aus SPEC-collaboration.md verifiziert
- [ ] `npm test` und `npm run build` grün
- [ ] Review mit Mensch

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Path-Traversal über Dateinamen bei Upload | Hoch | `buildStoragePath` generiert immer eine eigene UUID, nutzt den Original-Dateinamen nur als Anzeigename, nie als Pfadbestandteil |
| XSS über Markdown-Wiki-Inhalt | Hoch | `marked`-Output wird immer durch `isomorphic-dompurify` sanitisiert, bevor er ins DOM gelangt |
| Upload-Verzeichnis fehlt/nicht beschreibbar im Container | Mittel | Verzeichnis wird beim ersten Upload lazily erstellt (`mkdir -p`-Äquivalent), Docker-Volume für `UPLOADS_DIR` ergänzt |

## Open Questions
- Keine blockierenden
