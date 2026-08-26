# Spec: projects-tasks

Modul aus `CAPABILITY-MAP.md`. Baut auf `identity-org` auf — lebt innerhalb einer Tenant-Datenbank, referenziert `User` aus diesem Modul.

## Objective
Projekte, Tasks/Subtasks mit pro-Projekt konfigurierbaren Status-Workflows, Task-Abhängigkeiten, Custom Fields, vier Ansichten (Liste/Board/Kalender/Gantt), eine Triage-Inbox für neue Tasks und eine Command-Palette (Cmd+K) mit Suche + Schnell-Aktionen.

**Nutzer:** Alle Mitglieder einer Organisation.

**Erfolg:** Ein Team kann ein Projekt anlegen, seinen eigenen Status-Workflow definieren, Tasks erstellen/zuweisen/verknüpfen, sie in allen vier Ansichten betrachten und per Cmd+K schnell navigieren oder einen Task anlegen — neue Tasks landen zuerst in der Triage-Inbox, bevor sie ins aktive Board wandern.

## Datenmodell (Tenant-Schema, Ergänzung)
```prisma
model Project {
  id          String           @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime         @default(now())
  statuses    WorkflowStatus[]
  taskLinks   TaskProject[]
  customFields CustomFieldDef[]
}

enum StatusCategory {
  not_started
  started
  done
}

model WorkflowStatus {
  id        String         @id @default(uuid())
  project   Project        @relation(fields: [projectId], references: [id])
  projectId String
  name      String
  category  StatusCategory
  position  Int             // Sortierreihenfolge im Board
  isDefault Boolean         @default(false) // Status für neue Tasks (Triage)
  tasks     Task[]

  @@unique([projectId, name])
}

model Task {
  id            String         @id @default(uuid())
  title         String
  description   String?
  status        WorkflowStatus @relation(fields: [statusId], references: [id])
  statusId      String
  assignee      User?          @relation(fields: [assigneeId], references: [id])
  assigneeId    String?
  parentTask    Task?          @relation("Subtasks", fields: [parentTaskId], references: [id])
  parentTaskId  String?
  subtasks      Task[]         @relation("Subtasks")
  startDate     DateTime?
  dueDate       DateTime?
  inTriage      Boolean        @default(true) // true bis explizit ins Board übernommen
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  projects      TaskProject[]
  blocking      TaskDependency[] @relation("BlockingTask")
  blockedBy     TaskDependency[] @relation("BlockedTask")
  customValues  CustomFieldValue[]
}

// Many-to-many: ein Task kann in mehreren Projekten sichtbar sein (Cross-Tagging, siehe CAPABILITY-MAP.md).
// isPrimary markiert das "Haupt"-Projekt (bestimmt z.B. Default-Status-Workflow beim Anlegen).
model TaskProject {
  task      Task    @relation(fields: [taskId], references: [id])
  taskId    String
  project   Project @relation(fields: [projectId], references: [id])
  projectId String
  isPrimary Boolean @default(true)

  @@id([taskId, projectId])
}

model TaskDependency {
  id            String @id @default(uuid())
  blockingTask  Task   @relation("BlockingTask", fields: [blockingTaskId], references: [id])
  blockingTaskId String
  blockedTask   Task   @relation("BlockedTask", fields: [blockedTaskId], references: [id])
  blockedTaskId String

  @@unique([blockingTaskId, blockedTaskId])
}

enum CustomFieldType {
  text
  number
  select
  date
}

model CustomFieldDef {
  id        String          @id @default(uuid())
  project   Project         @relation(fields: [projectId], references: [id])
  projectId String
  key       String
  label     String
  type      CustomFieldType
  options   String[]        // nur relevant für type = select
  values    CustomFieldValue[]

  @@unique([projectId, key])
}

model CustomFieldValue {
  id      String         @id @default(uuid())
  field   CustomFieldDef @relation(fields: [fieldId], references: [id])
  fieldId String
  task    Task           @relation(fields: [taskId], references: [id])
  taskId  String
  value   String         // typabhängig interpretiert (Zahl/Datum als String gespeichert, im Code geparst)

  @@unique([fieldId, taskId])
}
```

## Verhalten
- **Projekt anlegen:** erzeugt automatisch einen Default-Workflow (Todo/not_started, In Progress/started, Done/done) — editierbar, nicht fix
- **Status-Workflow-Editor:** pro Projekt Status hinzufügen/umbenennen/Reihenfolge ändern/Kategorie setzen; ein Status mit Kategorie `not_started` und `isDefault: true` ist Pflicht (Ziel für Triage-Tasks)
- **Triage:** neue Tasks (`inTriage: true`) erscheinen in einer separaten Inbox-Ansicht pro Projekt, bevor sie ins Board übernommen werden (`inTriage: false`, bekommt regulären Status)
- **Task-Abhängigkeiten:** "blockiert"/"blockiert durch"-Relation, im UI als Liste am Task angezeigt; zyklische Abhängigkeiten werden serverseitig abgelehnt
- **Ansichten** (alle über dieselbe Task-Datenquelle, nur unterschiedliche Lenses):
  - **Liste:** sortierbar/filterbar nach Status, Assignee, Fälligkeit
  - **Board:** Spalten = `WorkflowStatus` des Projekts, Drag & Drop zwischen Spalten ändert `statusId`
  - **Kalender:** Tasks mit `dueDate` an ihrem Tag, Klick öffnet Task-Detail
  - **Gantt:** Zeitleiste nach `startDate`/`dueDate`, echtes Drag zum Verschieben/Resizen eines Balkens (ändert `startDate`/`dueDate`), Abhängigkeitspfeile zwischen verknüpften Tasks. **Bewusste Grenze:** Verschieben eines Tasks verschiebt abhängige Tasks NICHT automatisch mit (kein Scheduling-Engine in v1, siehe Boundaries)
- **Command-Palette (Cmd+K):** Fuzzy-Suche über Projekte + Tasks (Titel), Enter navigiert hin; Schnell-Aktion "Neuer Task" (mit optionaler Projekt-Vorauswahl, landet in Triage)

## Project Structure (Ergänzung)
```
prisma/tenant/schema.prisma          → um obige Modelle erweitert
src/tenant/
  projects/
    workflow.ts                       → reine Funktionen: Default-Workflow-Definition, Zyklus-Erkennung bei Task-Abhängigkeiten
  app/(tenant)/
    projects/
      page.tsx                          → Projekt-Liste
      new/page.tsx                       → Projekt anlegen
      [projectId]/
        layout.tsx                        → Ansicht-Umschalter (Liste/Board/Kalender/Gantt/Triage)
        list/page.tsx
        board/page.tsx
        calendar/page.tsx
        gantt/page.tsx
        triage/page.tsx
        settings/workflow/page.tsx          → Status-Workflow-Editor
    api/tenant/
      projects/route.ts
      projects/[id]/statuses/route.ts
      tasks/route.ts
      tasks/[id]/route.ts
      tasks/[id]/dependencies/route.ts
      search/route.ts                        → Command-Palette-Backend
  ui/
    commandPalette/CommandPalette.tsx        → global eingebunden (Cmd+K-Listener)
```

## Code Style
```typescript
// src/tenant/projects/workflow.ts
export function detectDependencyCycle(
  existingEdges: { blockingTaskId: string; blockedTaskId: string }[],
  newEdge: { blockingTaskId: string; blockedTaskId: string },
): boolean {
  // Graph-Traversierung (DFS) über existingEdges + newEdge, prüft ob blockedTaskId
  // transitiv wieder blockingTaskId erreicht — reine Funktion, unit-testbar ohne DB.
}
```

## Testing Strategy
- Vitest wie im Rest des Projekts
- Unit-Tests: Zyklus-Erkennung, Default-Workflow-Generierung, Custom-Field-Value-Parsing (Zahl/Datum-Strings)
- Integrationstests gegen echte lokale Tenant-Test-DB: Projekt→Task→Status-Wechsel→Board-Filter; Cross-Tagging (ein Task in zwei Projekten); Triage→Board-Übernahme
- Gantt-Drag-Interaktion und Command-Palette-UI bleiben manuelle Browser-Verifikation (wie bei OrbitControls im Referenzprojekt) — nicht sinnvoll ohne echten Browser zu testen

## Boundaries
- **Always:** Jeder Workflow-Status-Löschversuch, der noch Tasks referenziert, wird abgelehnt (keine verwaisten Tasks ohne Status)
- **Ask first:** Automatische Kaskaden-Verschiebung abhängiger Tasks im Gantt (echtes Scheduling) — nicht in v1, nur auf Rückfrage als Erweiterung
- **Never:** Zyklische Task-Abhängigkeiten zulassen; einen Task ohne mindestens ein verknüpftes Projekt existieren lassen

## Success Criteria
- [ ] Projekt anlegen erzeugt einen editierbaren Default-Workflow
- [ ] Task erstellen landet in Triage, Übernahme ins Board funktioniert
- [ ] Liste/Board/Kalender/Gantt zeigen dieselben Tasks konsistent, Board-Drag ändert Status persistent
- [ ] Gantt: Balken lässt sich per Drag verschieben/resizen, Änderung persistiert; Abhängigkeitspfeile werden angezeigt
- [ ] Zyklische Abhängigkeit wird serverseitig abgelehnt
- [ ] Ein Task lässt sich einem zweiten Projekt zuordnen (Cross-Tagging), ohne dupliziert zu werden
- [ ] Custom Fields (alle 4 Typen) lassen sich pro Projekt definieren und pro Task befüllen
- [ ] Cmd+K findet Projekte/Tasks per Fuzzy-Suche und kann einen neuen Task anlegen
- [ ] `npm run build` und `npm test` grün

## Open Questions
- Keine blockierenden — Umfang wurde bewusst erweitert (konfigurierbare Workflows, voller Gantt, Cmd+K-Aktionen), Kaskaden-Scheduling im Gantt bleibt explizit außen vor
