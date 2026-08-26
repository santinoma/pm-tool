# Spec: custom-roles-permissions

## Objective
Mittelstand- und Enterprise-Tenants können eigene Rollen mit einem festen
Berechtigungskatalog definieren und Nutzern zuweisen, statt nur der vier festen
Basis-Rollen (owner/admin/member/client). Enterprise-Tenants können zusätzlich
pro Projekt eine abweichende Rolle für einzelne Mitglieder setzen (delegierte
Projekt-Rechte ohne volle Tenant-Admin-Rechte).

## Assumptions (bestätigt)
1. Custom Roles: Name + Auswahl aus einem festen Katalog von ~10 Berechtigungs-
   Keys (kein beliebiges Objekt-für-Objekt-ACL). Feature-Key `custom_roles`
   (Mittelstand + Enterprise).
2. Projekt-Rollen-Overrides: nur Enterprise. Feature-Key `project_role_overrides`.
3. Rückwärtskompatibilität ist Pflicht: Solange kein Custom Role zugewiesen ist
   (oder das Feature nicht gebucht ist), verhält sich das System exakt wie
   heute — `owner`/`admin` haben alle Berechtigungen, `member`/`client` keine
   der neuen granularen Rechte. Das bestehende `canManageMembers()`-basierte
   System bleibt für alle nicht migrierten Stellen unverändert bestehen.
4. Scope-Grenze (wie zuvor bei `integrations-marketplace` explizit
   akzeptiert): Nicht alle ~50 bestehenden `canManageMembers()`-Aufrufe werden
   auf das neue System migriert. Migriert werden repräsentative, hochwertige
   Stellen: Mitgliederverwaltung/Rollen, Automations, Budgets/Financials-
   Verwaltung, Integrations-Marketplace, Workflow-Transition-Rules,
   Portfolios/Goals. Der Rest bleibt auf dem Basis-Rollensystem.
5. Die Verwaltung von Custom Roles selbst (anlegen/bearbeiten/löschen,
   Zuweisen) bleibt exklusiv `owner`/`admin` vorbehalten — auch mit
   aktiviertem Custom-Roles-Feature kann eine Custom Role diese Fähigkeit
   nicht an sich selbst delegieren (Sicherheitsgrenze).

## Tech Stack
Next.js App Router, TypeScript, Prisma (tenant DB), Vitest.

## Project Structure
- `src/tenant/permissions/permissionCatalog.ts` — reiner Katalog, Legacy-Fallback, `computeEffectivePermissions()`
- `src/tenant/permissions/resolvePermissions.ts` — DB-Wrapper (lädt CustomRole/Override)
- `src/app/api/tenant/roles/route.ts`, `.../roles/[id]/route.ts` — Custom-Role-CRUD
- `src/app/api/tenant/users/[id]/custom-role/route.ts` — Zuweisung
- `src/app/api/tenant/projects/[id]/role-overrides/route.ts`, `.../role-overrides/[overrideId]/route.ts`
- `src/app/(tenant)/settings/organization/roles/page.tsx` — Rollen-Editor-UI
- `tests/permissionCatalog.test.ts`, `tests/customRoles.test.ts`

## Testing Strategy
Vitest Unit-Tests für die reine Berechnungsfunktion (Legacy-Fallback, Custom
Role, Projekt-Override, Feature-Gating), Integrationstest über
`provisionTenant()`, Docker-E2E via curl.

## Boundaries
- Always: Rückwärtskompatibilität für Tenants ohne Custom Roles.
- Ask first: Migration weiterer bestehender `canManageMembers()`-Stellen nach
  Auslieferung.
- Never: Custom-Role-Verwaltung selbst delegierbar machen.

## Success Criteria
- Mittelstand-Tenant legt Custom Role mit Teilberechtigungen an, weist sie
  einem `member` zu → dieser kann genau die gewährten Aktionen ausführen,
  keine anderen.
- Enterprise-Tenant setzt Projekt-Override → Override hat Vorrang vor der
  tenant-weiten Custom Role für dieses eine Projekt.
- Klein-Tenant sieht die Rollen-Verwaltung nicht (Nav ausgeblendet, API 403).
