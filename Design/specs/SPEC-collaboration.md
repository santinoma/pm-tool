# Spec: collaboration

Modul aus `CAPABILITY-MAP.md`. Baut auf `projects-tasks` auf.

## Objective
Kommentare mit @Mentions an Tasks, Datei-Anhänge an Tasks, sowie projektgebundene Docs/Wiki-Seiten (Markdown, flache Liste).

**Nutzer:** Alle Mitglieder einer Organisation.

**Erfolg:** Ein Nutzer kommentiert einen Task, erwähnt eine Kollegin per `@email`, hängt eine Datei an, und legt eine Wiki-Seite mit Projektdokumentation an.

## Datenmodell (Tenant-Schema, Ergänzung)
```prisma
model Comment {
  id        String    @id @default(uuid())
  task      Task      @relation(fields: [taskId], references: [id])
  taskId    String
  author    User      @relation(fields: [authorId], references: [id])
  authorId  String
  body      String
  createdAt DateTime  @default(now())
  mentions  Mention[]
}

model Mention {
  id        String  @id @default(uuid())
  comment   Comment @relation(fields: [commentId], references: [id])
  commentId String
  user      User    @relation(fields: [userId], references: [id])
  userId    String

  @@unique([commentId, userId])
}

model Attachment {
  id           String   @id @default(uuid())
  task         Task     @relation(fields: [taskId], references: [id])
  taskId       String
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])
  uploadedById String
  filename     String
  mimeType     String
  sizeBytes    Int
  storagePath  String   // relativer Pfad unter dem konfigurierten Upload-Verzeichnis
  createdAt    DateTime @default(now())
}

model WikiPage {
  id        String   @id @default(uuid())
  project   Project  @relation(fields: [projectId], references: [id])
  projectId String
  title     String
  content   String   // Markdown, roh gespeichert
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
(Ergänzt entsprechende Rückwärts-Relationen an `User`/`Task`/`Project`.)

## Verhalten
- **Kommentare:** an einem Task, chronologisch, `@email`-Muster im Text werden beim Erstellen erkannt (Regex `@[\w.+-]+@[\w.-]+\.\w+`), gegen existierende `User.email` in der Tenant-DB abgeglichen, passende Treffer als `Mention` gespeichert; unbekannte `@...`-Strings werden ignoriert (kein Fehler)
- **Datei-Anhänge:** Upload über `multipart/form-data`, Datei wird unter einem konfigurierbaren Upload-Verzeichnis (`UPLOADS_DIR`, per Tenant in einem Unterordner `taskId/uuid-filename`) gespeichert; Download über eine eigene Route, die die Datei streamt (kein direkter Static-File-Zugriff, damit Tenant-Isolation über die Auth-Prüfung läuft)
- **Wiki-Seiten:** pro Projekt eine flache Liste, Titel + Markdown-Inhalt, editierbar, keine Versionshistorie in v1; Rendering als HTML im Browser über eine einfache, sichere Markdown-Bibliothek

## Project Structure (Ergänzung)
```
prisma/tenant/schema.prisma          → um obige Modelle erweitert
src/tenant/
  collaboration/
    mentions.ts                       → reine Funktion: extractMentionedEmails(text) -> string[]
    attachmentStorage.ts               → saveUploadedFile(), buildStoragePath(), reine Pfad-Logik getrennt von echtem Dateisystemzugriff
  app/(tenant)/
    projects/[id]/
      wiki/page.tsx                     → Wiki-Seiten-Liste
      wiki/new/page.tsx
      wiki/[pageId]/page.tsx             → Anzeige + Bearbeiten
    api/tenant/
      tasks/[id]/comments/route.ts        → POST/GET
      tasks/[id]/attachments/route.ts      → POST (Upload), GET (Liste)
      attachments/[id]/download/route.ts    → GET (Datei-Stream)
      projects/[id]/wiki/route.ts            → POST/GET
      wiki/[id]/route.ts                      → PATCH/DELETE
```

## Code Style
```typescript
// src/tenant/collaboration/mentions.ts
const EMAIL_PATTERN = /@[\w.+-]+@[\w.-]+\.\w+/g;

export function extractMentionedEmails(text: string): string[] {
  const matches = text.match(EMAIL_PATTERN) ?? [];
  return [...new Set(matches.map((m) => m.slice(1)))]; // führendes @ entfernen, deduplizieren
}
```

## Testing Strategy
- Vitest wie im Rest des Projekts
- Unit-Tests: `extractMentionedEmails` (mehrere/keine/doppelte Treffer, ungültige Muster), Upload-Pfad-Konstruktion
- Integrationstests: Kommentar mit bekannter/unbekannter E-Mail erzeugt korrekt 0/1 `Mention`-Einträge; Datei-Upload landet unter dem erwarteten Pfad, Download liefert denselben Inhalt zurück

## Boundaries
- **Always:** Datei-Download nur nach erfolgreicher Tenant-/Session-Prüfung, nie über einen direkt erreichbaren Static-Pfad
- **Ask first:** Externe Objekt-Storage-Anbindung (S3-kompatibel) statt lokalem Dateisystem — v1 bleibt lokal
- **Never:** Hochgeladene Dateipfade direkt aus Nutzereingaben (Dateiname) ableiten, ohne eigene generierte ID — verhindert Path-Traversal

## Success Criteria
- [ ] Kommentar an einem Task wird gespeichert und angezeigt
- [ ] `@bekannte-email@domain.de` im Kommentartext erzeugt einen `Mention`-Datensatz, unbekannte E-Mails erzeugen keinen Fehler und keinen Mention-Eintrag
- [ ] Datei-Upload an einem Task funktioniert, Download liefert die identische Datei zurück
- [ ] Wiki-Seite anlegen/bearbeiten funktioniert, Markdown wird sicher (kein XSS) als HTML gerendert
- [ ] `npm run build` und `npm test` grün

## Open Questions
- Keine blockierenden
