# Gallery Section Rebuild — Design Spec

**Date:** 2026-06-23
**Component:** Public booking page gallery (`book.bapita.com/[slug]`)
**Themes affected:** classic, clean, dark

## Problem

All three themes share one component (`src/app/[slug]/components/SectionGallery.tsx`, 168 lines) but each passes a different `layout` and a fixed photo count. A grid row only looks full when the photo count is a multiple of that theme's column count. Because every theme has a different column structure, the *same* number of photos fills one theme's rows but leaves a ragged last row — visible white space — in another.

### Root-cause table (current code)

| Theme | Layout prop | Mobile cols | Desktop cols | Cell ratio | Collapsed count |
|-------|-------------|-------------|--------------|------------|-----------------|
| Classic | `featured` | hero + 2 | hero + 3 | 16:9 hero, 4:3 tiles | `initialCount=4` (hero + 3) |
| Clean | `masonry` (square grid) | 2 | 3 | 1:1 | mobile 4, desktop 6 |
| Dark | `grid` | 1 | 2 | 4:3 | `initialCount=4` |

### Concrete defects

1. **Classic, mobile:** hero + 3 tiles → one row of 2 + one orphan tile → white gap beside the orphan. Worst offender.
2. **Any theme, expanded ("Show more"):** renders *all* photos; if the total is not a multiple of that theme's column count, the last row is ragged.
3. Collapsed counts (4/6) are tuned only for collapsed desktop; they break on mobile and when expanded.

Today the only count that looks acceptable on all three themes simultaneously is a multiple of 6. That is too fragile to rely on.

## Goal

Make the gallery look premium for **any** photo count N, on desktop and mobile, in all three themes. Optimal-count guidance becomes a nice-to-have, not a requirement.

## Decisions (locked)

- **Layout engine:** Hybrid. Clean uses justified rows; Classic and Dark use uniform cropped tiles. Each theme keeps its visual character.
- **In scope:** grid layout fix, upgraded lightbox, smart "Show more" counts, loading polish (skeleton + fade-in).
- **Out of scope:** admin/editor changes (no optimal-count hint in the business editor), changes to data model (`gallery_images` stays `string[]`, `image_focal` stays `Record<string,string>`).

## Architecture

Split the single component into focused units under a new folder:

```
src/app/[slug]/components/gallery/
  SectionGallery.tsx     // entry point; selects engine by `layout`; owns show-more state, lightbox state, shared button/style tokens
  UniformGrid.tsx        // Classic tiles + Dark; fixed-ratio cropped tiles with last-row fill
  JustifiedRows.tsx      // Clean; true aspect ratios, rows scaled to full width
  FeaturedHero.tsx       // Classic 16:9 full-width hero banner
  Lightbox.tsx           // upgraded full-screen viewer
  useImageRatios.ts      // hook: measures intrinsic width/height of image URLs for justified layout
```

The existing import path `../../components/SectionGallery` is preserved by keeping a `SectionGallery` export reachable from the same specifier (either keep the file at the old path re-exporting from the folder, or update the three theme imports to `../../components/gallery/SectionGallery`). Implementation plan decides which; default is to update the three imports.

### Per-theme configuration stays in props

Call sites keep driving look via props. Engines read config, not hardcoded theme knowledge.

- Classic: `<SectionGallery photos layout="featured" initialCount={...} desktopInitialCount={...} focal />`
- Clean: `<SectionGallery photos layout="masonry" borderRadius={10} initialCount={4} desktopInitialCount={6} focal />`
- Dark: `<SectionGallery photos layout="grid" borderRadius={2} initialCount={4} desktopInitialCount={...} focal />`

`layout` values map to engines: `featured` → FeaturedHero + UniformGrid (rest); `grid` → UniformGrid; `masonry` → JustifiedRows.

## Core mechanism: no white space for any N

### UniformGrid (Classic tiles + Dark)

Tiles are fixed-aspect, `object-fit: cover`, positioned by `image_focal`. The last partial row is filled by widening its final tile:

```
remainder = renderedCount % cols
if remainder !== 0:
  lastTile.gridColumn = `span ${cols - remainder + 1}`
```

Results:
- Dark desktop (2 cols), 5 photos → last tile spans 2 = full-width feature tile. No gap.
- Classic rest grid, mobile (2 cols), 3 tiles → orphan tile spans 2 = full width. Kills the mobile orphan bug.
- Mobile 1-col (Dark) → never ragged; rule is a no-op.

The widened tile reads as an intentional "feature" photo. `cols` is resolved from the active breakpoint (reuse the existing `isDesktop` resize logic).

### JustifiedRows (Clean)

Greedy row packing: walk images in order, accumulate into the current row until adding the next would exceed a target row height when scaled to container width, then commit the row scaled so its combined width equals 100% of the container. Every committed row fills the width exactly — gaps are mathematically impossible.

- Target row height: ~200px desktop, ~160px mobile (tunable).
- Last row: justify it as well, capped at 1.5× target height. If the only leftover is a single narrow image that would exceed the cap, render it left-aligned at target height (rare edge case).
- Requires intrinsic aspect ratios (see loading polish).

## Smart "Show more" counts

Collapsed view always shows a row-complete batch per breakpoint, so no orphan appears before expansion:

| Theme | Mobile collapsed | Desktop collapsed |
|-------|------------------|-------------------|
| Classic | hero + 2 | hero + 3 |
| Clean | 4 | 6 |
| Dark | 4 | 4 |

"Show more" reveals all remaining photos. Any ragged final row in the expanded state is handled by the core mechanism above (span-fill for uniform, justification for Clean). "Show less" collapses back.

## Loading polish

- Skeleton blocks rendered at the target cell/row height while images load.
- Fade-in (opacity transition) as each image fires `onload`.
- For JustifiedRows this is required: layout cannot run until ratios are measured by `useImageRatios`. Until measured, show skeleton row(s) at target height to avoid layout shift; swap in justified layout once ratios resolve.

## Upgraded lightbox

`Lightbox.tsx` replaces the inline lightbox. Features:

- Prev / next arrow buttons.
- Keyboard: `←` / `→` navigate, `Esc` closes (Esc already exists; extend it).
- Mobile: horizontal swipe to navigate (touchstart/touchmove/touchend threshold).
- Counter: `currentIndex + 1 / total`.
- Click backdrop closes; click image does not (stopPropagation, already present).
- Receives `photos`, `index`, `onIndexChange`, `onClose`.

## Optimal-count guidance (deliverable, documentation only)

After this rebuild, any N looks good. Tightest possible look if the user cares:

- **Clean & Dark:** any count; 6–12 is the visual sweet spot.
- **Classic:** 7 or 13 (hero + a multiple of 6) packs both breakpoints perfectly.

No longer enforced; included as guidance only. Not surfaced in the admin UI (out of scope).

## Constraints / notes for implementation

- `AGENTS.md`: this Next.js version has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing component code; heed deprecation notices.
- No data-model changes. `gallery_images: string[]`, `image_focal: Record<string,string>`, `show_gallery: boolean`.
- Preserve `focal` (object-position) behavior in all cropped tiles.
- Preserve `borderRadius` per theme (Classic default, Clean 10, Dark 2).

## Testing

- Render each theme at N = 1, 2, 3, 4, 5, 6, 7, 9, 12 photos; verify no white space on mobile (<680px) and desktop (≥680px) in collapsed and expanded states.
- Verify Classic mobile orphan bug is gone at hero+3.
- Verify lightbox prev/next wraps or clamps at ends (decide in plan; default clamp), keyboard and swipe both work, counter correct.
- Verify skeleton → fade-in, no layout jump in Clean justified once ratios load.
- Mixed portrait/landscape uploads crop correctly (uniform) and lay out without distortion (justified).
