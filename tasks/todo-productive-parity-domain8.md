# Task List: Produktiv-Parität Domäne 8 (Clients, CRM-unabhängig)

Quelle: `tasks/plan-productive-parity-roadmap.md`, Domäne 8. Bewusst klein
gehalten — CRM/Sales-Pipeline bleibt zurückgestellt (frühere Produkt-
Entscheidung), keine Deal/Pipeline/Proposal-Felder hinzugefügt.

## Fünf kleine Client-Verbesserungen — ✅ erledigt
- [x] Archivieren/Wiederherstellen (`archivedAt`), Status-Filter, archivierte
  Clients erscheinen nicht mehr in der Projekt-Erstellungs-Auswahl
- [x] Reichhaltigeres Profil: `taxId`/`website`/`billingAddress`
- [x] `ClientContact`-Unterentität (Name/E-Mail/Telefon/primär), zweiter
  primärer Kontakt hebt den ersten in derselben Transaktion auf
- [x] Parent/Child-Firmen (`parentId`), Zyklus-Ablehnung
  (`wouldCreateCycle`/`computeDescendantIds`), eingerückte Darstellung
- [x] Client-gebundener Aktivitäts-Feed (`GET .../activity`) — reine
  Aggregation über alle Projekte eines Clients, kein neuer Schreibpfad
- [x] Test: `clientExtensions.test.ts` (4 Tests)

## Docker-E2E-Verifikation (2026-08-27)
Client mit Steuernummer/Website angelegt, archiviert → `archivedAt` korrekt
gesetzt. (Weitere Details siehe Domäne-4-Dokument, gemeinsame
Verifikations-Runde.)

## Checkpoint: Abschluss
- [x] Tests+Build grün (im Rahmen der gemeinsamen Domäne-4-Verifikation:
  705/705), Docker-Verifikation
- [ ] Review mit Mensch vor Abschluss des Moduls
