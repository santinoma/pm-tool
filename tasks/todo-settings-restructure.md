# Task List: settings-restructure

Siehe `SPEC-settings-restructure.md`. Reines Navigations-/Platzhalter-Modul,
kein separater plan-*.md nötig (keine Architekturentscheidungen).

- [x] Task 1: `/settings` Hub → drei Gruppen (My Settings/Organization/Users) mit Beschreibungstexten
- [x] Task 2: My Settings Unterseiten (Account echt, Notifications/Security/Appearance Platzhalter)
- [x] Task 3: Organization-Platzhalter (Service types, Recycle bin, Workflows, Automations)
- [x] Task 4: Users-Gruppe (Mitglieder-Link + Employee-fields-Platzhalter)
- [x] Task 5: "Zeiterfassung" zur Hauptnavigation (AppShell) hinzugefügt

## Checkpoint: Abschluss — ✅ erreicht
- [x] Success-Criteria verifiziert (Hub zeigt drei Gruppen, Account zeigt echte Name/E-Mail/Rolle, alle 8 neuen Seiten → HTTP 200, Zeiterfassung im Sidebar-Nav sichtbar)
- [x] `npm test` (239 Tests) und `npm run build` grün
- [x] Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
