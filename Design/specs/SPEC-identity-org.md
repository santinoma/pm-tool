# Spec: identity-org

Modul aus `CAPABILITY-MAP.md`. Baut auf `tenant-provisioning` auf — alles hier lebt **innerhalb einer Tenant-Datenbank** (die DB-Grenze ist die Org-Grenze, kein `organization_id`-Spaltenmuster nötig).

## Objective
Nutzer, Teams, Rollen/Rechte und Login/Session-Verwaltung für eine einzelne Organisation (= ein Tenant). Nach der Provisionierung bekommt der erste Nutzer über einen Einladungslink Zugriff und kann weitere Team-Mitglieder einladen.

**Nutzer dieses Moduls:** Alle Mitglieder einer Organisation (nicht der Platform-Admin — der lebt in `tenant-provisioning`).

**Erfolg:** Ein Kunde bekommt nach der Provisionierung einen Einladungslink, setzt darüber sein Passwort, loggt sich ein, lädt Kolleg:innen per E-Mail-Adresse ein, weist ihnen Rollen zu.

## Datenmodell (Tenant-Schema, Ergänzung)
```prisma
enum Role {
  owner
  admin
  member
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String?  // null, solange die Einladung noch nicht angenommen wurde
  name         String?
  role         Role     @default(member)
  createdAt    DateTime @default(now())
  sessions     Session[]
  teamMembers  TeamMember[]
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Invite {
  id        String   @id @default(uuid())
  email     String
  token     String   @unique
  role      Role     @default(member)
  expiresAt DateTime
  acceptedAt DateTime?
  createdAt DateTime @default(now())
}

model Team {
  id        String       @id @default(uuid())
  name      String
  createdAt DateTime     @default(now())
  members   TeamMember[]
}

model TeamMember {
  team   Team   @relation(fields: [teamId], references: [id])
  teamId String
  user   User   @relation(fields: [userId], references: [id])
  userId String

  @@id([teamId, userId])
}
```

## Verhalten
- **Erster Zugang:** `provisionTenant` (bestehendes Modul) wird um einen Schritt ergänzt: nach erfolgreicher Migration wird in der neuen Tenant-DB ein `Invite`-Eintrag mit Rolle `owner` erzeugt; der Einladungslink (`https://{subdomain}.{baseDomain}/accept-invite/{token}`) wird im Platform-Admin-UI angezeigt (kein E-Mail-Versand in v1)
- **Einladung annehmen:** Seite `/accept-invite/[token]` — Nutzer setzt Namen + Passwort, `User`-Datensatz wird mit `passwordHash` befüllt (oder neu angelegt, falls die E-Mail noch nicht existiert), `Invite.acceptedAt` wird gesetzt, Session wird erstellt
- **Login:** E-Mail + Passwort, bei Erfolg wird ein `Session`-Eintrag erzeugt und die Session-ID als `httpOnly`-Cookie gesetzt (scoped auf die jeweilige Subdomain)
- **Weitere Einladungen:** `owner`/`admin` können über die UI weitere `Invite`-Einträge mit E-Mail + Rolle erzeugen; Link wird angezeigt (kein E-Mail-Versand in v1, siehe Boundaries)
- **Rollen:** `owner` (genau eine pro Tenant, kann nicht entfernt werden, nur übertragen), `admin` (kann Mitglieder/Teams verwalten), `member` (Standard)
- **Teams:** einfache Gruppierung von Usern, ohne verschachtelte Hierarchie in v1

## Project Structure (Ergänzung)
```
prisma/tenant/schema.prisma        → um obige Modelle erweitert
src/
  tenant/
    auth/
      session.ts                    → createSession, getSessionFromCookie, destroySession
      password.ts                    → hashPassword, verifyPassword (bcryptjs)
      invite.ts                       → createInvite, acceptInvite, generateInviteToken
    context.ts                        → liest Tenant-Header aus proxy.ts, liefert den passenden tenantDb-Client + eingeloggten User für Server Components
  app/
    (tenant)/
      login/page.tsx
      accept-invite/[token]/page.tsx
      members/page.tsx                → Mitgliederliste + "Einladen"-Formular (owner/admin)
    api/
      tenant/
        login/route.ts
        logout/route.ts
        invites/route.ts
```

## Code Style
```typescript
// src/tenant/auth/session.ts
export async function createSession(userId: string): Promise<{ sessionId: string; expiresAt: Date }> {
  // 1. Session-Zeile in der Tenant-DB anlegen (7 Tage Gültigkeit)
  // 2. sessionId als httpOnly, secure (in Produktion), sameSite=lax Cookie zurückgeben
}
```

- Passwörter niemals im Klartext loggen oder in Fehlermeldungen zurückgeben
- Jede Server-Funktion, die Tenant-Daten anfasst, bekommt den `tenantDb`-Client explizit übergeben (kein globaler Zustand) — Fortführung des Musters aus `tenant-provisioning`

## Testing Strategy
- Vitest, wie im Rest des Projekts
- Unit-Tests: Passwort-Hashing/Verifikation, Invite-Token-Generierung/-Validierung, Rollen-Berechtigungsprüfungen (reine Funktionen)
- Integrationstests gegen eine echte lokale Tenant-Test-DB: Einladung annehmen → Login → Session-Cookie gültig; abgelaufene/bereits angenommene Invites werden abgelehnt

## Boundaries
- **Always:** Passwörter ausschließlich gehasht speichern (bcryptjs, Cost-Faktor ≥ 12); Session-Cookies `httpOnly` + `sameSite=lax`
- **Ask first:** Echter E-Mail-Versand (SMTP-Anbieter, Absender-Domain) — v1 zeigt Links nur in der UI an
- **Never:** Die letzte `owner`-Rolle eines Tenants entfernen, ohne dass eine andere Person zum `owner` befördert wurde — ein Tenant ohne `owner` darf nicht entstehen

## Success Criteria
- [ ] Neuer Tenant hat nach Provisionierung einen sichtbaren Einladungslink im Platform-Admin-UI
- [ ] Einladung annehmen setzt Passwort, erstellt `User` mit Rolle `owner`, loggt automatisch ein
- [ ] Login/Logout funktioniert, Session-Cookie ist `httpOnly`
- [ ] Owner/Admin kann weitere Mitglieder einladen und ihnen eine Rolle zuweisen
- [ ] Abgelaufene oder bereits angenommene Invites werden mit klarer Fehlermeldung abgelehnt
- [ ] `npm run build` und `npm test` grün

## Open Questions
- Passwort-Reset-Flow ("Passwort vergessen") ist in v1 nicht spezifiziert — wird als kleine Erweiterung nach diesem Modul nachgezogen, falls gewünscht, blockiert aber nicht den Kernflow
