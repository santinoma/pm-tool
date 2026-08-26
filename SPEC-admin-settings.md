# Spec: admin-settings

## Objective
Konsolidierte Tenant-interne Verwaltung: eine Organisations-Einstellungsseite (Währung), Mitglieder-Deaktivierung (statt Löschen) und ein Settings-Hub, der die bereits bestehenden Bereiche (Mitglieder, Zeiterfassung) zusammenführt. Rollen-Konfiguration ist durch die bestehende `/members`-Seite bereits abgedeckt und wird hier nicht erweitert.

**Nutzer:** Owner/Admin für Verwaltung; alle Nutzer für den Settings-Hub-Einstieg.

**Erfolg:** Owner/Admin kann die Tenant-Währung ändern und Mitglieder deaktivieren/reaktivieren; ein deaktivierter Nutzer kann sich nicht mehr einloggen; `/settings` verlinkt alle Admin-Bereiche.

## Tech Stack
Next.js (App Router) + TypeScript + PostgreSQL + Prisma — unverändert.

## Project Structure
```
prisma/tenant/schema.prisma                    → User.isActive
src/tenant/auth/roleGuard.ts                   → Erweiterung: wouldDeactivateLastOwner()
src/app/api/tenant/tenant-settings/route.ts     → PATCH erweitert um currency
src/app/api/tenant/users/[id]/active/route.ts   → PATCH isActive, nur owner/admin
src/app/(tenant)/settings/organization/page.tsx → Währungs-Einstellung
src/app/(tenant)/settings/page.tsx              → Hub, verlinkt Organisation/Zeiterfassung/Mitglieder
src/app/(tenant)/members/MembersClient.tsx       → Erweiterung: Deaktivieren/Reaktivieren-Button
tests/roleGuard.test.ts                         → Erweiterung um wouldDeactivateLastOwner()
tests/adminSettings.test.ts                     → Integrationstest gegen echte Tenant-DB (Login-Sperre für inaktive Nutzer, Schutz des letzten Owners)
```

## Code Style
Reine Logik von DB/HTTP getrennt (bestehendes Muster, analog zu `wouldRemoveLastOwner`):
```ts
export function wouldDeactivateLastOwner(users: UserRoleInfo[], targetUserId: string): boolean {
  const target = users.find((u) => u.id === targetUserId);
  if (!target || target.role !== "owner") return false;
  const remainingActiveOwners = users.filter(
    (u) => u.role === "owner" && u.id !== targetUserId,
  );
  return remainingActiveOwners.length === 0;
}
```

## Testing Strategy
Vitest. `wouldDeactivateLastOwner` ist eine reine Funktion, direkt unit-getestet (analog zu den bestehenden `wouldRemoveLastOwner`-Tests). Login-Verhalten für deaktivierte Nutzer und Rollen-Schutz beim Deaktivieren werden als Integrationstest gegen eine per `provisionTenant()` erzeugte Tenant-DB getestet. Die Seiten selbst werden zusätzlich manuell via Docker/curl verifiziert.

## Boundaries
- **Always:** Ein deaktivierter Nutzer bleibt in der Datenbank (Kommentare, Zeiteinträge, Zuweisungen bleiben unverändert sichtbar/zurechenbar) — nur der Login wird verweigert.
- **Ask first:** Erweiterung um nutzerdefinierte Rollen/granulare Permissions (explizit nicht Teil dieses Moduls).
- **Never:** Ein Nutzer kann sich nicht selbst deaktivieren; der letzte aktive Owner kann nicht deaktiviert werden.

## Success Criteria
- `PATCH /api/tenant/tenant-settings` mit `currency` aktualisiert die Tenant-weite Währung; `/settings/organization` zeigt/bearbeitet sie.
- `PATCH /api/tenant/users/[id]/active` mit `isActive: false` durch `owner`/`admin` deaktiviert einen anderen Nutzer; der deaktivierte Nutzer kann sich danach nicht mehr einloggen (Login liefert Fehler).
- Versuch, den letzten aktiven Owner zu deaktivieren, wird abgelehnt (409, analog zu `wouldRemoveLastOwner`).
- Versuch, sich selbst zu deaktivieren, wird abgelehnt.
- `member`-Rolle erhält 403 beim Versuch, jemanden zu deaktivieren.
- `/settings` verlinkt auf Organisation, Zeiterfassung, Mitglieder.

## Open Questions
Keine — Annahmen vom Menschen bestätigt ("Passt so").
