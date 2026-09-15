---
name: PM Tool — Next-Elite × Productive Reference
description: Tailwind CSS 4 + shadcn/ui design system, re-tuned to the "asbrucon Productive Entwickler-Referenz" hub & design-system spec (violet accent, RAG semantics, serif display type, mono data labels).
colors:
  background: "#ffffff"
  foreground: "#1B1826"
  card: "#ffffff"
  muted: "#6E6880"
  border: "#E7E3F0"
  primary: "#6C58E0"
  success: "#2C9E77"
  warning: "#C98421"
  destructive: "#D2564A"
  info: "#3E86C9"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', var(--font-archivo), 'Segoe UI', system-ui, sans-serif"
    lineHeight: 1.6
  display:
    fontFamily: "var(--font-lora), Georgia, 'Times New Roman', serif"
    letterSpacing: "-0.01em"
    appliesTo: "h1, h2"
  dataLabel:
    fontFamily: "var(--font-jetbrains-mono), ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    textTransform: uppercase
    letterSpacing: wide
    appliesTo: "table column headers"
rounded:
  chip: "6px"
  control: "9px"
  card: "14px"
---

# Design System: PM Tool — Next-Elite × Productive Reference

## Overview

The app runs app-wide on **Tailwind CSS 4 + shadcn/ui** ("Next-Elite" —
see `NEXTELITE-MIGRATION-CAPABILITY-MAP.md` for the migration history that
replaced two earlier generations, a "Field Atlas" system and an
"Apple-HIG" system that both lived directly in `globals.css` and are now
fully removed). All tokens live as CSS custom properties on `:root` /
`:root.dark` in `src/ui/shadcn/tokens.css`, consumed through Tailwind's
`@theme inline` block in `src/ui/shadcn/tailwind.css`.

**This document is ground truth for what's shipped today.** The palette,
radius scale and typography were re-tuned session-over-session to match
the **"Productive — Entwickler-Referenz"** spec (asbrucon, hub &
design-system §06 "Starter-System: Design-Tokens" + §05 "Datenvisualisierung
& Farbsemantik") — a PSA/project-management reference UI. The Next-Elite
component layer (shadcn primitives, `AppShellNextElite`) is unchanged
structurally; only its color, radius and type tokens moved toward the
reference. Nothing here reintroduces the removed Apple-HIG/Field-Atlas
class-based systems (`.btn`, `.card`, `.field`, ...) — components are
still plain shadcn/Tailwind, styled via the tokens below.

## Colors

### Accent
- **Primary** (`#6C58E0` light / `#8A78EF` dark): the sole brand accent —
  primary buttons, focus rings, active nav, links, selected states.

### Neutral
- **Background** (`#ffffff` light / `#09090b` dark)
- **Foreground / Ink** (`#1B1826` light / `#F3F1FA` dark): primary text —
  a dark violet-black, not pure black, per the reference's "Ink" token.
- **Muted** (`#6E6880` light / `#A39CB8` dark): secondary text, metadata,
  uppercase field/column labels.
- **Border** (`#E7E3F0` light / `#29242F` dark): the reference's pale
  violet-tinted hairline, used for card/table/input borders.

### RAG semantics (state only, never decoration — kept separate from the brand accent)
- **Success / OK** (`#2C9E77` light / `#3DBE8E` dark)
- **Warning / Warn** (`#C98421` light / `#E0A44A` dark)
- **Destructive / Crit** (`#D2564A` light / `#E17568` dark)
- **Info / Billable** (`#3E86C9` light / `#63A6DE` dark): a fourth
  semantic color for informational/billing-related states (e.g. billable
  time, informational badges) — distinct from the brand accent and from
  the three RAG colors, per the reference's "Info/Bill" token. Wired as
  `--color-info`/`--color-info-foreground`; `Badge` has `info`/
  `infoOutline` variants.

## Typography

Three-tier system per the reference's typography token table:

- **Body / UI**: the existing system-sans stack (`-apple-system` /
  `SF Pro` falling back to the bundled Archivo webfont), now at **1.6
  line-height** (`body` in `globals.css`).
- **Display**: a serif face (Google Font "Lora", loaded via
  `next/font/google` in `src/app/layout.tsx` as `--font-lora`), applied
  globally to every `<h1>`/`<h2>` with `-0.01em` letter-spacing (see the
  `h1, h2` rule in `globals.css`). This is a single, low-risk global rule
  rather than a per-page class, so it covers all ~110 files that render a
  literal heading tag.
- **Data / Labels**: JetBrains Mono (`--font-jetbrains-mono`, already
  present pre-reference), applied to table column headers
  (`TableHead` — uppercase, tracked, `text-muted-foreground`) and
  `tabular-nums` applied to every table cell (`TableCell` — a no-op on
  non-numeric text, correct alignment for numeric columns). The generic
  form-field `Label` component gets the same uppercase/tracked/muted
  treatment but stays in the body sans rather than mono, for legibility
  of longer German compound words.

## Shape

Reference "Masse" radius scale, three steps (down from the previous
four-step calc-derived scale):
- **6px** (`--radius-sm`): chips/badges (`Badge` now uses `rounded-sm`
  instead of Tailwind's unthemed default `rounded`).
- **9px** (`--radius-md`, `--radius` base): buttons, inputs, selects,
  panels — the default control radius.
- **14px** (`--radius-lg`/`--radius-xl`): cards and modals (`Card` now
  uses `rounded-lg` instead of `rounded-md`).

## Where the tokens are wired

- `src/ui/shadcn/tokens.css` — raw values, `:root`/`:root.dark`.
- `src/ui/shadcn/tailwind.css` — `@theme inline` aliases (`--color-info`,
  `--font-display`, `--font-mono`, radius scale) so Tailwind utilities
  (`bg-info`, `font-serif`-equivalent via `font-display`, `rounded-lg`,
  ...) resolve to them.
- `src/app/layout.tsx` — `Lora` (display serif) added alongside the
  existing `Archivo`/`JetBrains_Mono` `next/font/google` loads.
- `src/app/globals.css` — `body` line-height, `h1`/`h2` display-font rule
  (both in the `base` layer, so Tailwind utilities can still override
  per-instance).
- Shared primitives touched directly (cascades to every call site, no
  per-page edits needed): `Card`, `Badge`, `Table`
  (`TableHead`/`TableCell`), `Label`.

## Coverage

Because every shadcn primitive (`Button`, `Input`, `Select`, `Dialog`,
`Sheet`, `Card`, `Badge`, `Table`, `Label`, ...) consumes these CSS
variables rather than hardcoded values, and the app has zero remaining
v1/v2/v3 styling (see the migration map), this token/primitive-level
change reaches every screen — app chrome, all module pages, settings, the
task slide-over, dialogs, forms — without page-by-page edits. Verified
visually across dashboard, projects list, project detail (list/board),
task-create dialog, settings hub, and time tracking, in both light and
dark mode.

## Do's and Don'ts

### Do:
- **Do** add new semantic color needs (a fifth state, a chart series) as
  a new CSS variable in `tokens.css` + `@theme inline` alias, the same
  way `--info` was added — never a one-off inline hex value in a
  component.
- **Do** keep RAG (`success`/`warning`/`destructive`/`info`) reserved for
  state, never for decoration or brand emphasis — that stays `primary`.
- **Do** rely on the shared primitives (`Card`, `Badge`, `Table`,
  `Label`, `Button`) for new UI — they already carry the reference's
  radius/typography tokens.

### Don't:
- **Don't** reintroduce the removed Apple-HIG/Field-Atlas class-based
  systems (`.btn`, `.card`, `.field`, `.legend-key`, pill-shaped
  segmented-control nav, translucent blurred topbar) — those directions
  were deliberately replaced app-wide by Next-Elite and are gone from
  `globals.css`.
- **Don't** hardcode hex colors or ad-hoc `rounded-[Npx]` values in page
  components; use the token-backed Tailwind utilities.
- **Don't** apply the mono/uppercase "Data / Labels" treatment to running
  prose or long free-text — it's for column headers, property labels and
  short data values only.
