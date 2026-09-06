# Implementation Plan: search-modifiers

## Overview
`parseSearchQuery(raw)` extrahiert `status:`/`assignee:`/`project:`-Token
(quotiert oder nicht) per Regex aus dem Suchstring, alles Übrige wird zu
Freitext getrimmt. Die Route wendet die erkannten Filter auf die
Task-Suche an; `assignee:me` wird serverseitig auf `context.currentUser.id`
aufgelöst.

## Architecture Decisions
- Modifier-Parsing ist eine reine Funktion, unabhängig von Prisma/DB —
  leicht test- und wiederverwendbar.
- Unbekannte Status-Synonyme (z. B. "todo", "open" für not_started) werden
  über eine kleine Normalisierungstabelle abgebildet, kein strikter Fehler
  bei Tippfehlern — bewusst nachsichtig ("kein Jira-Lernkurve").
- Sobald mindestens ein Modifier erkannt wurde, werden ausschließlich
  Tasks durchsucht (keine Projekte) — Modifier sind Task-Attribute.

## Task List

### Phase 1: Reine Logik
- [ ] Task 1: `parseSearchQuery()` + Tests

### Phase 2: API
- [ ] Task 2: `/api/tenant/search` wendet erkannte Modifier auf die Task-Suche an

### Phase 3: UI
- [ ] Task 3: Advanced-Toggle + Kurzreferenz in `CommandPalette`

### Checkpoint: Abschluss
- [ ] Alle Success-Criteria verifiziert, Tests+Build grün, Docker-E2E, Review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Bestehende Cmd+K-Nutzung ohne Modifier bricht | Hoch falls Regex zu aggressiv | Regex matcht nur explizite `key:value`-Muster, alles andere bleibt Freitext |

## Open Questions
Keine.
