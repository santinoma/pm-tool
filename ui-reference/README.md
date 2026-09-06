# UI Reference

`next-elite/` is an unmodified, vendored copy of the original design template used
as the source for the Next-Elite UI migration:
https://github.com/salmanshahriar/Next-Elite

Purpose: ground-truth reference for re-doing the migration correctly (buttons,
component styling, etc. were not faithfully carried over in the first pass —
see `NEXTELITE-MIGRATION-CAPABILITY-MAP.md`). Do not edit files under
`next-elite/` — treat it as read-only reference. Compare against it, copy
patterns from it, but the actual app code lives under `src/`.

To refresh this copy later:
  rm -rf ui-reference/next-elite
  git clone --depth 1 https://github.com/salmanshahriar/Next-Elite.git ui-reference/next-elite
  rm -rf ui-reference/next-elite/.git

## Running it standalone (for side-by-side visual comparison)

The template ships its own Dockerfile/docker-compose.yml and runs fully
standalone (in-memory auth, no external DB needed). It's a separate Docker
Compose project from the main pm-tool stack — different network, different
port (6767 vs. pm-tool's 3000) — so both can run at the same time:

  cd ui-reference/next-elite
  cp .env.example .env   # already done once; edit BETTER_AUTH_SECRET etc. if needed
  docker compose up -d --build

Then open http://localhost:6767 — e.g. /ui-components for the full component
showcase, or /login (demo mode is on, so the login page offers seeded demo
accounts) to see the real sidebar/dropdown/dialog styling, including dark
mode, to compare against the migrated app.

Stop it with `docker compose down` from this directory.
