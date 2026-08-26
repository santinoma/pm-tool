---
name: PM Tool — Field Atlas
description: A cartographic/gazetteer-inspired design system for an Operate-mode project management SaaS.
colors:
  bg: "#f1f3f4"
  surface: "#ffffff"
  surface-2: "#e7ebec"
  border: "#d3d9da"
  border-strong: "#b7c0c1"
  text: "#141b1e"
  text-muted: "#566063"
  text-faint: "#8a9497"
  accent: "#0f7a82"
  accent-strong: "#0b636a"
  accent-contrast: "#ffffff"
  accent-tint: "#dcefef"
  warning: "#9a6b13"
  warning-tint: "#f3e6cc"
  danger: "#a3352a"
  danger-tint: "#f4dcd9"
  success: "#2f7d55"
  success-tint: "#dcefe4"
typography:
  body:
    fontFamily: "var(--font-archivo), Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "var(--font-archivo), Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "var(--font-archivo), Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  label:
    fontFamily: "var(--font-archivo), Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.04em"
  mono:
    fontFamily: "var(--font-jetbrains-mono), JetBrains Mono, SFMono-Regular, Consolas, monospace"
    fontSize: "0.75rem"
    fontVariation: "tabular-nums"
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
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
    padding: "0 1rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "38px"
    padding: "0 0.75rem"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  widget-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "1.25rem"
  legend-key:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.5rem"
---

# Design System: PM Tool — Field Atlas

## Overview

**Creative North Star: "Field Atlas"**

Field Atlas translates a cartographic/gazetteer vocabulary into a restrained Operate-mode UI. The metaphor lives in structure and naming, not in surface decoration: there is no parchment texture, no globe imagery, no literal compass rose. Instead, status reads through one consistent legend-key component (swatch + label) rather than ad hoc colored pills, task and project identifiers render in monospace "grid-coordinate" style, the sidebar functions as a gazetteer index, Cmd+K is framed as the index lookup, and progress renders as a map's graphic scale bar. Dashboard widgets are bordered "map insets" with a small corner-tick marginal-reference mark in two opposite corners — the one deliberately map-derived graphic device the system permits, because the direction contract calls for it explicitly and it does not resemble a decorative flourish added after the fact.

Color strategy is deliberately restrained for an Operate-mode tool: cool graphite/charcoal neutrals, chosen specifically to avoid the warm-cream-plus-serif "AI-generated landing page" look. One hydrographic-teal accent carries all primary actions, selection, and links; muted ochre, red, and green are reserved for warning/destructive/success state only, never for decoration. Dark mode is the primary, designed-for mode (built to evoke a chart room at night); light mode is a fully coherent alternative served via `prefers-color-scheme`, not an afterthought.

The build is disciplined about restraint: no drop shadows beyond two soft ambient values used on exactly two floating/overlay surfaces, no uppercase kickers or eyebrow labels above headings, no glyph icon set (the UI uses text, a monospace "⌘K" hint, and a plain ↑/↓ character where a control needs a symbol). This is a working tool for desk use, not a marketing surface — density and legibility outrank ornament.

**Key Characteristics:**
- Cool graphite neutrals, dark-mode-primary, no cream/parchment skeuomorphism
- One teal accent used only for primary action, selection, and links
- Status expressed exclusively through the legend-key swatch+label pattern
- Monospace used narrowly: coordinates/IDs, wordmarks, kbd hints, tabular numerals
- Progress expressed as a graphic scale bar, never a percentage-only readout
- Nearly flat: hairline borders do the separating work, not shadows

**Coverage — what is authoritative today.** The Field Atlas system now covers the full application, not just the initial slice:
- Shell: root layout/fonts, `AppShell`, `AdminShell`, `ProjectSubnav` (now rendered once per project via `projects/[id]/layout.tsx`, not per-page), `LegendKey`, `CommandPalette`.
- Every tenant page (dashboard, projects list/new, task list/board/calendar/gantt/hill-chart/triage/activity/budget/wiki/check-ins/workflow settings, task detail, members, notifications, reports, resource planning, time tracking, settings hub + organization/time-tracking/webhooks) and every platform-admin page (tenants list + new-tenant form) use these tokens and components.

There is no remaining surface still on the old ad hoc inline-style look. Any new page should be built directly against the tokens/components documented here rather than reintroducing inline styles.

## Colors

The palette is a cool, low-chroma graphite scale with a single warm-cool accent and three narrow state colors.

### Primary
- **Hydrographic Teal** (`#0f7a82` light / `#2fd9c4` dark): the sole accent. Used for primary buttons, focus rings, active nav/tab/subnav indicators, selected board columns, links, and the command-palette active tab. Its tint (`#dcefef` light / `#163330` dark) backs focus rings and active/drag-over states.

### Neutral
- **Bg** (`#f1f3f4` light / `#11171a` dark): page background.
- **Surface** (`#ffffff` light / `#1a2225` dark): cards, panels, topbars, table rows, inputs.
- **Surface-2** (`#e7ebec` light / `#151c1f` dark): sidebar background, table header, hover rows, legend-key default fill, kbd keys.
- **Border / Border-strong** (`#d3d9da` / `#b7c0c1` light, `#2a3538` / `#3b4a4d` dark): hairline dividers everywhere; border-strong is reserved for inputs, dashed empty-states, and hover-elevated board cards.
- **Text / Text-muted / Text-faint** (`#141b1e` / `#566063` / `#8a9497` light): a three-step text scale — primary copy, secondary labels (nav, table headers, field labels), and tertiary metadata (coordinate IDs, hints).

### State (used only for state, never decoration)
- **Warning (muted ochre)** (`#9a6b13` light / `#d7a44b` dark) with tint `#f3e6cc` / `#3a2f1a`.
- **Danger (muted red)** (`#a3352a` light / `#e2685c` dark) with tint `#f4dcd9` / `#3a201d`: destructive actions, overdue/over-budget scale-bar fills, field errors.
- **Success (muted green)** (`#2f7d55` light / `#4cc38a` dark) with tint `#dcefe4` / `#17332a`: done status.

### Named Rules
**The Legend, Not a Rainbow Rule.** Status and category state is always expressed through `.legend-key` (swatch + label), never as an ad hoc colored pill or bare colored text. This is the system's core translation of "map legend" into UI.

**The One Accent Rule.** Teal is the only color used for action and selection. Warning/danger/success never appear on interactive chrome (buttons, nav) — they mark data state only.

## Typography

**Body/UI Font:** Archivo (with Helvetica Neue, Arial, sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (with SFMono-Regular, Consolas, monospace fallback)

**Character:** A single grotesque sans (Archivo) carries all prose and UI chrome at a fairly tight, dense size; JetBrains Mono is reserved for anything that reads as "data" — coordinates, wordmarks, keyboard hints, tabular numerals — reinforcing the chart/index metaphor without introducing a second display face.

### Hierarchy
- **Title / h1** (600, 1.875rem, -0.01em): page titles ("Dashboard", "Projekte").
- **Title / h2** (600, 1.5rem, -0.01em): section headers within a page.
- **Title / h3** (600, 1.25rem, -0.01em): card/widget-level headers.
- **Body** (400, 0.9375rem, 1.5 line-height): default UI copy, table cells, list items.
- **Label** (600–700, 0.75rem, 0.02em–0.08em letter-spacing, uppercase): field labels, table headers, widget titles, nav-section headers, board-column headers — always uppercase, always the smallest step in the scale.
- **Coord/mono** (400, 0.75rem, tabular-nums): task/project identifiers, wordmark marks, `<kbd>` hints, command-palette result-type tags.

### Named Rules
**The Uppercase Label Rule.** Every structural label (field label, table header, widget title, nav section, board column header) is 0.75rem, 600–700 weight, uppercase, with positive letter-spacing, and colored `text-muted` or `text-faint` — never full `text`. This is the system's only sanctioned use of uppercase; it is never applied to a heading (h1–h3) or as a decorative kicker above one.

## Layout

The shell is a fixed two-column app frame: a 240px sidebar (`--sidebar-width`) acting as the gazetteer index, and a flexible main column with a 56px topbar (`--topbar-height`). The platform-admin surface drops the sidebar for a single topbar-plus-content stack, keeping the same topbar height and wordmark treatment so the two surfaces read as siblings. Content containers cap at 1080px (`.container`) and center with `2rem 1.5rem` padding; the dashboard narrows this further to 920px for its widget grid.

Spacing follows a single rem-based scale from 0.25rem to 4rem (`--space-1` … `--space-16`, effectively a 4px base grid). Widget/dashboard cards lay out in a responsive auto-fit grid (`minmax(280px, 1fr)`) with `--space-5` gaps. The board (kanban) view is a horizontally scrolling row of fixed-minimum-width (260px) columns. Tables and lists use hairline row dividers rather than card-per-row treatment.

## Elevation & Depth

The system is nearly flat. Depth is conveyed almost entirely through hairline borders and background-tone steps (`surface` vs `surface-2` vs `bg`), not shadows. Two shadow tokens exist and are used sparingly, reserved for floating/overlay surfaces that need to visually detach from the page: the auth card and the command palette panel. Board cards get a very soft shadow only on hover, as a state response, not an ambient effect.

### Shadow Vocabulary
- **shadow-sm** (`0 1px 2px rgba(20,27,30,0.06)` light / `0 1px 2px rgba(0,0,0,0.3)` dark): board-card hover only.
- **shadow-md** (`0 6px 20px rgba(20,27,30,0.1)` light / `0 12px 32px rgba(0,0,0,0.45)` dark): the auth card and the command-palette panel — the system's only two "lifted" surfaces.

### Named Rules
**The Flat-By-Default Rule.** Cards, panels, and widgets are flat (border only, no shadow) at rest. Shadow is reserved for genuinely overlaid/floating surfaces (modal-equivalents: auth card, command palette) and for hover state, never for ordinary content cards.

## Shapes

Three radius steps only: 4px (`--radius-sm`, the default for buttons, inputs, legend-key, board cards), 6px (`--radius-md`, panels, widgets, tables, board columns), and 10px (`--radius-lg`, top-level cards, the auth card, the command-palette panel). Nothing is fully rounded (pill) and nothing is sharp-square; the scale is small and consistent. Borders are hairline (1px) throughout, in `border` for structural dividers and `border-strong` for interactive-surface edges (inputs, hovered board cards, dashed empty-states).

The one recurring non-rectangular form device is the `.widget-card` corner tick: a small (6px) two-sided border mark in the top-left and bottom-right corners, evoking a chart's marginal reference mark. It appears only on dashboard widget cards, never elsewhere.

## Components

### Buttons
- **Shape:** 4px radius, 36px height (28px for `.btn-sm`), horizontal padding at `--space-4`.
- **Primary:** teal background (`#0f7a82`/`#2fd9c4`), white/dark contrast text, darkens to `accent-strong` on hover.
- **Secondary:** surface background with a `border-strong` outline; on hover the border and text shift to accent teal (an outline treatment, not a fill swap).
- **Ghost:** transparent, muted text; on hover fills with `surface-2` and darkens text to full `text`.
- **Danger:** transparent with a danger-colored outline and text; on hover fills with `danger-tint`. Reserved for destructive actions only.

### Legend Key (signature component)
The system's translation of the map-legend metaphor into a status indicator: an 8px square swatch plus an uppercase-adjacent label, in a bordered pill-corner (4px radius) chip. Five states: default (faint gray), started (teal), done (green), warning (ochre), danger (red). This is the *only* sanctioned way to show status/category color in the product — never a bare colored dot, bare colored text, or an ad hoc pill.

### Scale Bar (signature component)
Progress renders as a thin (6px), bordered, rounded-end bar with a solid teal fill — "a map's graphic scale" per the direction contract — rather than a numeric-only readout or a rainbow-segmented bar. An `is-over` modifier swaps the fill to danger red when a value exceeds 100% (utilization, budget actuals). Always paired with a label row above it showing the exact value in monospace.

### Cards / Containers
- **Corner Style:** 10px (`.card`, `.auth-card`, `.cmdk-panel`) or 6px (`.panel`, `.widget-card`, `.table-wrap`, `.board-col`).
- **Background:** `surface` (cards/panels/widgets) or `surface-2` (board columns, sidebar).
- **Shadow Strategy:** flat by default; see Elevation & Depth.
- **Border:** 1px `border` on every card/panel/widget/table/board-col.
- **Internal Padding:** `--space-6` for `.card`, `--space-5` for `.widget-card`, `--space-3` for board columns/cards.

### Inputs / Fields
- **Style:** 38px height, 4px radius, 1px `border-strong` outline, `surface` background.
- **Focus:** border shifts to accent teal plus a 3px `accent-tint` glow ring (`box-shadow: 0 0 0 3px var(--accent-tint)`) — no browser default outline.
- **Error:** field-error text renders in `danger`, sized `--text-sm`, below the field.
- **Label:** always the uppercase Label style (see Typography), never inline/floating.

### Navigation
Sidebar (`.app-sidebar`) groups links under uppercase faint section headers; active items get a `surface` background pill and teal text/weight-600, hover gets the same background without the color shift. The project-workspace sub-nav (`.subnav`) is a horizontal tab strip with a 2px bottom-border indicator in accent teal on the active tab — the same active-indicator language as the command palette's tab strip. Platform-admin uses a single topbar with no sidebar, sharing the monospace wordmark treatment (`PM·Atlas`, with the middot dot in accent teal) with the tenant app shell.

### Command Palette (signature component)
Framed as the "index lookup" for the gazetteer metaphor. A centered overlay panel (10px radius, shadow-md) with a tabbed strip (active tab gets accent-tint background + teal text), a borderless full-width search input, and result rows tagged with a monospace type label (`.cmdk-result-type`) before the result text — mirroring the coordinate/ID mono treatment used elsewhere.

## Do's and Don'ts

### Do:
- **Do** express all status/category state through `.legend-key` (swatch + uppercase-adjacent label), not a bare pill or colored text.
- **Do** render task/project identifiers and tabular data (hours, percentages, dates) in JetBrains Mono with `tabular-nums`.
- **Do** keep teal as the only interactive-action color; warning/danger/success are for data state only.
- **Do** keep cards and panels flat (border only); reserve shadow for the auth card, command palette, and card hover state.
- **Do** express progress as a `.scale-bar`, with an exact value in a label row above it, not a bare percentage or a segmented rainbow bar.
- **Do** use the widget-card corner tick only on dashboard/map-inset widgets, not as a general card decoration.

### Don't:
- **Don't** add uppercase kicker/eyebrow text above an h1–h3 heading. The system's only uppercase label use is the structural Label role (field labels, table headers, widget titles, nav headers) — never decorative copy stacked above a headline.
- **Don't** introduce a second display/serif face or warm cream backgrounds; the palette is deliberately cool graphite to avoid the generic "AI landing page" look, even though this is an internal tool where that risk is lower.
- **Don't** add hard-offset neobrutalist shadows or drop shadows on ordinary content cards; this world's elevation model is flat-with-borders, not lifted.
- **Don't** use a glyph icon font or icon library; the build uses plain text, `⌘`/`↑`/`↓` characters, and the mono type label pattern instead.
- **Don't** invent a new accent color for a future feature. Route new state needs through the existing warning/danger/success trio or through `.legend-key`'s variant set before adding a color.
