---
name: PM Tool — Apple HIG
description: An Apple/macOS Human-Interface-Guidelines-inspired design system for an Operate-mode project management SaaS.
colors:
  bg: "#f5f5f7"
  surface: "#ffffff"
  surface-2: "#f0f0f2"
  border: "rgba(0,0,0,0.1)"
  border-strong: "rgba(0,0,0,0.18)"
  text: "#1d1d1f"
  text-muted: "#6e6e73"
  text-faint: "#98989d"
  accent: "#0071e3"
  accent-strong: "#0060c0"
  accent-contrast: "#ffffff"
  accent-tint: "rgba(0,113,227,0.12)"
  warning: "#b3792b"
  warning-tint: "#fbf0e0"
  danger: "#d70015"
  danger-tint: "#fde7e8"
  success: "#1e8e3e"
  success-tint: "#e3f5e8"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', var(--font-archivo), 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontWeight: 600
    fontSize: "1.25rem"
    letterSpacing: "-0.01em"
  headline:
    fontWeight: 600
    fontSize: "1.875rem"
    letterSpacing: "-0.01em"
  label:
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.02em"
  mono:
    fontFamily: "ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, var(--font-jetbrains-mono), Consolas, monospace"
    fontSize: "0.75rem"
    fontVariation: "tabular-nums"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  pill: "980px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
  10: "2.5rem"
  12: "3rem"
  16: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-contrast}"
    rounded: "{rounded.sm}"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    borderColor: "{colors.border-strong}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    shadow: "shadow-md"
    padding: "1.5rem"
  widget-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    shadow: "shadow-md"
    padding: "1.25rem"
  topbar:
    backgroundColor: "rgba(255,255,255,0.82)"
    backdropFilter: "blur(20px)"
    height: "52px"
---

# Design System: PM Tool — Apple HIG

## Overview

**Creative North Star:** the app should feel like a well-crafted native
macOS/iPadOS panel — translucent chrome, restrained neutral grays, one
confident system-blue accent, generous rounded corners — rather than a
generic SaaS dashboard built from stock web components.

This is the system actually shipped in `src/app/globals.css` today. It
supersedes an earlier "Field Atlas" cartographic direction (teal accent,
graphite/paper neutrals, sidebar-as-gazetteer) that was built first and
then deliberately replaced app-wide — see git history: `0882648 Build the
Field Atlas design system...` followed by `943d732 Migrate the Apple-HIG
design from Dashboard to the whole app`. The Field Atlas doc content that
previously lived here was stale relative to the code; this file now
documents ground truth.

**Key characteristics:**
- Restrained neutral grays (`#f5f5f7` background family) — no cream/parchment, no graphite/charcoal
- A single system-blue accent (`#0071e3` light / `#2997ff` dark) for all primary action, selection, and links
- SF Pro system font stack (falls back to the app's Archivo webfont, never the reverse)
- Translucent, blurred sticky topbar (`backdrop-filter: blur(20px)`) instead of a left sidebar — the tenant app, admin, and portal shells all share this pattern
- Nav is a pill-shaped segmented control (`--radius-pill: 980px`) inside the topbar, not a list of links
- Soft ambient shadows on cards/modals/panels (`--shadow-md`), not hairline-only flatness
- Generous corner radii: 8px on controls, 12px on panels/tables, 18px on cards/modals — nothing sharp-square, nothing fully flat like the earlier direction

**Coverage.** The Apple-HIG system covers the whole application — tenant
app shell, admin shell, portal shell, auth pages, command palette, all
project workspace views (list/board/calendar/gantt/hill-chart/triage),
task detail, budgets, settings, time tracking, and every feature added in
subsequent sessions (custom fields, automations, rate cards, scenarios,
private/key tasks, etc.) — because those were all built against the same
shared `globals.css` token classes (`.card`, `.btn`, `.field`, `.legend-key`,
`.board-col`, ...) rather than reintroducing inline styles.

## Colors

### Primary
- **System Blue** (`#0071e3` light / `#2997ff` dark): the sole accent — primary buttons, focus rings, active nav pill, selected states, links. Tint (`rgba(0,113,227,0.12)` light) backs focus rings, active board columns, and the command-palette active tab.

### Neutral
- **Bg** (`#f5f5f7` light / `#1e1e1e` dark): page background — the classic macOS System Gray 6.
- **Surface** (`#ffffff` light / `#2c2c2e` dark): cards, panels, tables, inputs.
- **Surface-2** (`#f0f0f2` light / `#252525` dark): pill-nav track, table headers, hover rows, board columns.
- **Border / Border-strong**: low-opacity black/white (`rgba(0,0,0,0.1)` / `rgba(0,0,0,0.18)` light) rather than solid grays — the Apple hairline convention.
- **Text / Text-muted / Text-faint** (`#1d1d1f` / `#6e6e73` / `#98989d` light): primary copy, secondary labels, tertiary metadata.

### State (state only, never decoration)
- **Warning** (`#b3792b` light / `#e3ab52` dark)
- **Danger** (`#d70015` light / `#ff453a` dark) — Apple's system-red
- **Success** (`#1e8e3e` light / `#32d74b` dark) — Apple's system-green

## Typography

**Font stack:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Archivo, "Helvetica Neue", Arial, sans-serif` — real SF Pro on Apple devices via `-apple-system`/`BlinkMacSystemFont`, falling back to the app's bundled Archivo webfont elsewhere so non-Apple users still see a geometric-neutral face rather than generic Arial.

**Mono:** `ui-monospace, "SF Mono", "SFMono-Regular", Menlo, JetBrains Mono, Consolas, monospace` — used narrowly for coordinate-style data (durations, tabular numbers, kbd hints).

### Hierarchy
- **h1** (600, 1.875rem, -0.01em letter-spacing): page titles.
- **h2** (600, 1.5rem): section headers.
- **h3** (600, 1.25rem): card/widget headers.
- **Body** (400, 0.9375rem, 1.5 line-height): default UI copy.
- **Field label** (600, 0.75rem, uppercase, 0.02em tracking, `text-muted`): form field labels, table headers, widget titles.

## Layout

No sidebar anywhere in the tenant app — navigation lives entirely in a
sticky, translucent topbar (`--topbar-height: 52px`, `backdrop-filter:
blur(20px)`) containing the wordmark, a pill-shaped segmented nav
(`.app-topbar-nav` / `.app-nav-item.is-active`), a search trigger
(`⌘K`), and account controls. The admin and portal shells mirror the
same topbar treatment for visual continuity across all three surfaces.
Content containers cap at 1080px (`.container`) and center with
`2rem 1.5rem` padding.

Spacing follows the same 4px-based rem scale as before (`--space-1` …
`--space-16`). Widget grids auto-fit at `minmax(280px, 1fr)`. The board
(kanban) view scrolls horizontally with fixed-minimum-width columns.

## Elevation & Depth

Unlike a flat/hairline-only system, Apple HIG depth comes from soft,
diffuse ambient shadows plus translucency, not borders alone.

- **shadow-sm** (`0 1px 2px rgba(0,0,0,0.04)`): subtle, used on hover states.
- **shadow-md** (`0 6px 20px rgba(0,0,0,0.07)` light / `0 8px 20px rgba(0,0,0,0.5)` dark): cards, widget-cards, modals, the command palette, dropdown panels — most raised surfaces carry this, not just overlays.
- **Translucent chrome**: topbars use `rgba(surface, 0.82)` + `backdrop-filter: blur(20px)` so content scrolls beneath a frosted-glass bar, the signature macOS "material" effect.

## Shapes

Five radius steps: 4px (`--radius-xs`, swatches/small chips), 8px
(`--radius-sm`, buttons/inputs/board cards), 12px (`--radius-md`,
panels/tables/calendar), 18px (`--radius-lg`, cards/modals/auth card),
and a full pill (`--radius-pill: 980px`, the topbar segmented nav and nav
items) — the pill is the system's signature Apple-native shape, absent
from the earlier flat/hairline direction entirely.

## Components

### Buttons
36px height (28px `.btn-sm`), 8px radius. Primary: solid system-blue,
darkens on hover. Secondary: white surface with a `border-strong`
outline that turns accent-blue on hover. Ghost: transparent, fills
`surface-2` on hover. Danger: outlined in system-red, fills `danger-tint`
on hover.

### Topbar Nav (signature component)
A translucent, blurred, sticky bar containing a pill-track segmented
control (`.app-topbar-nav`, `surface-2` background, full pill radius);
the active nav item gets a white pill (`surface` background) with a soft
shadow, echoing macOS's segmented-control selection state. This — not a
sidebar — is the app's primary navigation surface across tenant, admin,
and portal shells alike.

### Cards / Containers
18px radius (`.card`, `.widget-card`, `.auth-card`, `.modal-panel`,
`.cmdk-panel`) or 12px (`.panel`, `.table-wrap`, `.board-col`,
`.calendar-grid`). All carry `shadow-md` at rest — this system does not
follow a flat-by-default rule; soft elevation is the default state for
raised content, not just overlays.

### Inputs / Fields
38px height, 8px radius, `border-strong` outline. Focus: border turns
system-blue plus a 3px `accent-tint` glow ring — no browser default
outline.

### Legend Key / Scale Bar
Both signature status/progress components carry over unchanged in
behavior from the prior system (swatch+label chip; bordered progress bar
with a solid accent fill, red when over 100%) — only their color/shape
values changed to the Apple-HIG tokens above.

### Command Palette
Centered overlay, 18px radius, `shadow-md`, tabbed strip with an
accent-tint active tab, borderless search input — same structural role
as before, restyled to the new token set.

## Do's and Don'ts

### Do:
- **Do** keep navigation in the translucent topbar pill-nav — never reintroduce a left sidebar in the tenant app.
- **Do** give raised surfaces (cards, panels, modals) `shadow-md` at rest; this system's elevation model is soft-and-translucent, not flat-with-borders.
- **Do** use the full pill radius (`--radius-pill`) for segmented-control-style nav and nothing else — it should stay a recognizable, singular device.
- **Do** keep system-blue as the only interactive-action color; warning/danger/success mark data state only.
- **Do** prefer `-apple-system`/`BlinkMacSystemFont` as the lead font stack entries so real SF Pro renders on Apple devices.

### Don't:
- **Don't** reintroduce the earlier Field Atlas system's cool-graphite/teal palette, monospace-coordinate-everywhere treatment, or gazetteer sidebar — that direction was deliberately replaced app-wide, not merged with this one.
- **Don't** flatten cards back to border-only/no-shadow; that reads as the prior system, not this one.
- **Don't** add square-cornered controls; every interactive element uses at least the 8px radius step.
