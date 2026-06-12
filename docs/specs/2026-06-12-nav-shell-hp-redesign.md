# Nav / Shell HP Redesign — Spec

**Date:** 2026-06-12
**Scope:** Navigation + app shell only. Files: `src/components/AppShell.tsx`, `src/app/globals.css`. No page bodies, no calendar grid.
**Goal:** Make the dashboard shell match the homepage (HP) visual language, and fix a P0 bug: the hamburger drawer is unreachable on mobile.

---

## Problem

1. **P0 — mobile drawer unreachable.** `☰` renders only in the desktop top nav. On mobile there is no top bar, so Settings / Extras / Usage / Profile / Sign out cannot be opened from a phone. Mobile is the primary surface.
2. **HP mismatch.** Current nav uses `rounded-xl`, a flat amber underline, solid cream bars, bare-text wordmark, and inline-JS hover. The HP uses pills (`9999px`), a translucent blurred bar with hairline border, a logo mark + wordmark, hover lift (`translateY`), warm gradient washes, and layered soft shadows.

## HP visual tokens (source of truth)

From `bapita/v2/src/dashboard/index (27).html`:

- Bar bg: `rgba(250,245,236,.82)` + `backdrop-filter: saturate(140%) blur(12px)`, border-bottom `1px solid rgba(30,26,20,.09)`.
- Pill radius `9999px` on buttons + active states.
- `--amber-soft: rgba(232,146,10,.10)` for active/hover wash.
- `--wash-amber: linear-gradient(157deg,#F8DEAE 0%,#E79B22 100%)` for the primary CTA.
- `--shadow-sm: 0 2px 6px rgba(30,26,20,.05),0 1px 2px rgba(30,26,20,.04)`.
- `--shadow-amber: 0 12px 30px rgba(232,146,10,.32)` for amber hover lift.
- Logo mark: inline SVG (amber nutmeg, `viewBox 0 0 110 90`) from `bapita/v2/src/dashboard/img/favicon.svg`.

## Changes

### 1. `globals.css` — shared tokens
Add a `:root` block (after `@theme`) with non-color tokens so dashboard and HP share one vocabulary:
`--amber-soft`, `--wash-amber`, `--wash-sand`, `--shadow-sm`, `--shadow-md`, `--shadow-amber`, `--line`.
(Kept out of `@theme` since they are gradients/shadows, used via `var()` in inline styles.)

### 2. `AppShell.tsx` — logo mark
New `BapitaMark` component inlining the favicon SVG (width 26, height auto). Used in desktop top nav and mobile top bar.

### 3. Desktop top nav (re-skin)
- Bar: translucent blur bg + hairline border (replace solid cream). Height `h-14` (56px).
- Start: `BapitaMark` + "bapita" wordmark (800 weight, `-0.03em`).
- Tabs become **pills**: active = `--amber-soft` bg pill + dark text; inactive = muted; hover handled by CSS `hover:` classes. Remove the sliding underline and the `onMouseEnter/onMouseLeave` JS.
- `☰` stays far end, opens drawer.

### 4. Mobile top bar (NEW)
- In-flow row at top of the shell column, `flex md:hidden`, `h-16` (64px), `shrink-0`, translucent blur + hairline border. In-flow (not fixed) so existing body layout is unchanged.
- **Generic pages:** `☰` (start) → drawer · `BapitaMark` + "bapita" (center) · spacer (end).
- **Calendar page** (`onCalendar && chrome`): `☰` (start) · `monthYear ▾` (center, `chrome.openDatePicker`) · `⋮` (end) → calendar action menu.
- Calendar `⋮` reuses the existing `CalendarViewMenu` component (view toggle / filter / jump-to-today / calendar settings), rendered fixed below the bar, toggled by new `mobileCalMenuOpen` state. "Calendar settings" routes to `/settings`.

### 5. Mobile bottom nav (re-skin)
- Keep 4 tabs. Active state upgraded: amber icon sits inside an `--amber-soft` rounded-full pill; label amber. Inactive unchanged (muted, no pill).

### 6. Calendar left sidebar (re-skin)
- "New Booking" → pill (`rounded-full`), `--wash-amber` gradient bg, hover lift (`translateY(-1px)`) + `--shadow-amber`.
- Date-picker button, view-toggle segmented control, filter rows → pill radii + softer shadows. Same controls and handlers, HP skin only.

### 7. Drawer label
- `drawerItems`: "Add-ons" → **"Extras"** (path `/addons` unchanged). Swap `IconAddons` (grid) for a sparkles `IconExtras`.

## Out of scope
- Page bodies, calendar grid polish, RTL/Hebrew (English only for now), logo asset file in `public/` (inlined instead).

## Acceptance
- On mobile, `☰` (or calendar variant) is visible on every page and opens the drawer.
- Desktop tabs, mobile bottom nav, and calendar sidebar visually read like the HP (pills, blur bar, mark, washes).
- No behavior regressions: routing, drawer, FAB, CalendarChrome controls all still work.
- Drawer shows "Extras" with a new icon.
