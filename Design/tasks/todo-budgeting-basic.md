# Task List: budgeting-basic

Siehe `tasks/plan-budgeting-basic.md` und `SPEC-budgeting-basic.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `Project` erhält `budgetHours` (Float?), `budgetAmount` (Float?), `hourlyRate` (Float?); `TenantSettings` erhält `currency` (String, Default `"EUR"`).
**Acceptance:** Migration lässt sich anwenden, bestehende Projekte/Settings bleiben unverändert lesbar.
**Verify:** `npm run db:tenant:migrate`
**Files:** `prisma/tenant/schema.prisma`
**Scope:** S

---

## Checkpoint: Schema — ✅ erreicht
- [x] Migration angewendet, `npm run build` grün

## Phase 2: Reine Logik

### Task 2: `computeBudgetStatus()` — ✅ erledigt
**Beschreibung:** Reine Funktion, nimmt `TimeEntry[]` (nur `durationMinutes`) + `hourlyRate` entgegen, liefert `{ actualHours, actualAmount }`; `actualAmount` ist `null` wenn `hourlyRate` `null` ist.
**Acceptance:** Leeres Array → `actualHours = 0`, `actualAmount` je nach Rate; Einträge ohne `durationMinutes` werden als 0 gezählt.
**Verify:** `tests/budgetAggregate.test.ts`
**Files:** `src/tenant/budgeting/aggregate.ts`, `tests/budgetAggregate.test.ts`
**Scope:** S

---

## Phase 3: API + UI

### Task 3: Budget-API-Route — ✅ erledigt, via Docker verifiziert (GET/PATCH, 403 für member)
**Beschreibung:** `GET /api/tenant/projects/[id]/budget` liefert Soll-Werte + berechnete Ist-Werte (Query über `TimeEntry`, direkt am Projekt ODER über Task mit primärer `TaskProject`-Verknüpfung zu diesem Projekt). `PATCH` aktualisiert `budgetHours`/`budgetAmount`/`hourlyRate`, nur für `owner`/`admin`.
**Acceptance:** GET liefert korrekte Ist-Werte inkl. Task-gebundener Einträge; PATCH durch `member` → 403.
**Verify:** `tests/budgeting.test.ts`
**Files:** `src/app/api/tenant/projects/[id]/budget/route.ts`, `tests/budgeting.test.ts`
**Scope:** M

### Task 4: Budget-Seite — ✅ erledigt, via Docker verifiziert
**Beschreibung:** `/projects/[id]/budget/page.tsx` zeigt Soll/Ist für Stunden und Betrag (Betrag nur wenn `hourlyRate` gesetzt, formatiert mit `TenantSettings.currency`); Bearbeitungsformular für die drei Felder (nur sichtbar/aktiv für owner/admin).
**Acceptance:** Anzeige und Bearbeitung funktionieren manuell im Browser/Docker.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/(tenant)/projects/[id]/budget/page.tsx`, `src/app/(tenant)/projects/[id]/budget/BudgetClient.tsx`
**Scope:** M

---

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria aus SPEC-budgeting-basic.md verifiziert
- [x] `npm test` (140 Tests) und `npm run build` grün
- [x] Review mit Mensch vor Abschluss des Moduls
