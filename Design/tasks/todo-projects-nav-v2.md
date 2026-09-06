# Task List: projects-nav-v2

Siehe `tasks/plan-projects-nav-v2.md` und `SPEC-projects-nav-v2.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `TenantSettings` erhält `triageEnabled` (Boolean, Default `true`).
**Verify:** `npm run db:tenant:migrate`
**Files:** `prisma/tenant/schema.prisma`

---

## Checkpoint: Schema — ✅ erreicht

## Phase 2: Reine Logik + Route-Anpassung

### Task 2: `resolveInitialTriageState()` — ✅ erledigt
**Files:** `src/tenant/projects/triageState.ts`, `tests/resolveInitialTriageState.test.ts`

### Task 3: Route-Anpassungen — ✅ erledigt, via Docker verifiziert (true/false beide Pfade)
**Files:** `src/app/api/tenant/tasks/route.ts`, `src/app/api/tenant/tenant-settings/route.ts`, `tests/tenantSettingsTriage.test.ts`

---

## Phase 3: Navigation + Seiten

### Task 4: Sidebar-Split — ✅ erledigt, via Docker verifiziert
**Files:** `src/ui/shell/AppShell.tsx`

### Task 5: Meine-Tasks-Seite — ✅ erledigt, via Docker verifiziert
**Files:** `src/app/(tenant)/my-tasks/page.tsx`, `src/app/(tenant)/my-tasks/MyTasksClient.tsx`

### Task 6: Fortschritts-Spalte — ✅ erledigt, via Docker verifiziert
**Files:** `src/app/(tenant)/projects/page.tsx`

### Task 7: Triage-Toggle + bedingter Subnav-Tab — ✅ erledigt, via Docker verifiziert (Tab verschwindet korrekt)
**Files:** `src/app/(tenant)/settings/organization/page.tsx`, `src/app/(tenant)/settings/organization/OrganizationSettingsClient.tsx`, `src/app/(tenant)/projects/[id]/layout.tsx`, `src/ui/shell/ProjectSubnav.tsx`

### Task 8: "Neuer Task"-Inline-Formular — ✅ erledigt, via Docker verifiziert (List + Board)
**Files:** `src/app/(tenant)/projects/[id]/list/ListClient.tsx`, `src/app/(tenant)/projects/[id]/board/BoardClient.tsx`

---

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria aus SPEC-projects-nav-v2.md verifiziert
- [x] `npm test` (214 Tests) und `npm run build` grün
- [x] Review mit Mensch vor Abschluss des Moduls
