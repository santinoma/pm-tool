# Task List: admin-settings

Siehe `tasks/plan-admin-settings.md` und `SPEC-admin-settings.md`.

## Phase 1: Datenmodell

### Task 1: Tenant-Schema erweitern — ✅ erledigt
**Beschreibung:** `User.isActive` (Boolean, Default `true`).
**Acceptance:** Migration lässt sich anwenden, bestehende Nutzer bleiben `isActive: true`.
**Verify:** `npm run db:tenant:migrate`
**Files:** `prisma/tenant/schema.prisma`
**Scope:** S

---

## Checkpoint: Schema — ✅ erreicht
- [x] Migration angewendet, `npm run build` grün

## Phase 2: Reine Logik

### Task 2: `wouldDeactivateLastOwner()` — ✅ erledigt
**Beschreibung:** Reine Funktion, analog zu `wouldRemoveLastOwner()`, prüft ob eine Deaktivierung den letzten (aktiven) Owner entfernen würde.
**Acceptance:** Letzter Owner kann nicht deaktiviert werden; Nicht-Owner oder Owner mit anderen verbleibenden Owners können deaktiviert werden.
**Verify:** `tests/roleGuard.test.ts`
**Files:** `src/tenant/auth/roleGuard.ts`, `tests/roleGuard.test.ts`
**Scope:** S

---

## Phase 3: API + Login-Integration

### Task 3: Login-Route erweitern — ✅ erledigt, via Docker verifiziert (401 für deaktivierten Nutzer)
**Beschreibung:** Login prüft `user.isActive`; bei `false` gleiche generische Fehlermeldung wie bei falschem Passwort (kein Informationsleck).
**Acceptance:** Deaktivierter Nutzer kann sich mit korrektem Passwort nicht einloggen.
**Verify:** Teil von `tests/adminSettings.test.ts`
**Files:** `src/app/api/tenant/login/route.ts`
**Scope:** S

### Task 4: Deaktivierungs-Route — ✅ erledigt, via Docker verifiziert (403/409/400/200 alle korrekt)
**Beschreibung:** `PATCH /api/tenant/users/[id]/active` setzt `isActive`, nur für `owner`/`admin`; lehnt Selbst-Deaktivierung und Deaktivierung des letzten Owners ab.
**Acceptance:** 403 für `member`; 409 für letzten Owner; 400 für Selbst-Deaktivierung; sonst erfolgreich.
**Verify:** `tests/adminSettings.test.ts`
**Files:** `src/app/api/tenant/users/[id]/active/route.ts`, `tests/adminSettings.test.ts`
**Scope:** M

### Task 5: `tenant-settings`-Route erweitern — ✅ erledigt, via Docker verifiziert
**Beschreibung:** `PATCH /api/tenant/tenant-settings` akzeptiert zusätzlich `currency`.
**Acceptance:** `currency` wird persistiert und bei GET zurückgegeben.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/api/tenant/tenant-settings/route.ts`
**Scope:** S

---

## Phase 4: UI

### Task 6: Organisations-Einstellungen — ✅ erledigt, via Docker verifiziert
**Beschreibung:** `/settings/organization/page.tsx` zeigt/bearbeitet die Tenant-Währung.
**Acceptance:** Änderung wird gespeichert und bleibt nach Reload erhalten.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/(tenant)/settings/organization/page.tsx`, `src/app/(tenant)/settings/organization/OrganizationSettingsClient.tsx`
**Scope:** S

### Task 7: Settings-Hub + Mitglieder-Deaktivierung im UI — ✅ erledigt, via Docker verifiziert
**Beschreibung:** `/settings/page.tsx` verlinkt Organisation/Zeiterfassung/Mitglieder; `MembersClient.tsx` erhält einen Deaktivieren/Reaktivieren-Button (nur owner/admin, nicht für sich selbst/letzten Owner sichtbar oder zumindest serverseitig abgelehnt).
**Acceptance:** Hub verlinkt alle drei Bereiche; Deaktivieren/Reaktivieren funktioniert manuell im Browser.
**Verify:** Manuell im Browser/Docker
**Files:** `src/app/(tenant)/settings/page.tsx`, `src/app/(tenant)/members/MembersClient.tsx`, `src/app/(tenant)/members/page.tsx`
**Scope:** M

---

## Checkpoint: Abschluss — ✅ erreicht
- [x] Alle Success-Criteria aus SPEC-admin-settings.md verifiziert
- [x] `npm test` (188 Tests) und `npm run build` grün
- [x] Review mit Mensch vor Abschluss des Moduls
