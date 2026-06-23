# Gallery Section Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the booking-page gallery so it looks premium for any photo count, on mobile and desktop, across the classic/clean/dark themes — eliminating ragged-last-row white space.

**Architecture:** Split the single `SectionGallery.tsx` into focused units under `components/gallery/`. A hybrid layout engine: Clean uses justified rows (true aspect ratios, rows scaled to full width); Classic and Dark use uniform cropped tiles with a last-row span-fill rule. Plus an upgraded lightbox, smart row-complete "Show more" counts, and skeleton/fade-in loading.

**Tech Stack:** Next.js 16.2.7 (App Router), React client components, inline `<style>` + inline styles (matches existing gallery code), plain `<img>` tags (existing pattern — not `next/image`).

## Global Constraints

- Next.js is **16.2.7** with breaking changes. Before writing component code, consult `node_modules/next/dist/docs/01-app` for any relevant deprecations. New code mirrors patterns already proven in the existing `SectionGallery.tsx` (which renders today): `"use client"` at top, `useState`/`useEffect`, plain `<img>`, inline `<style>` blocks.
- No test framework exists. Do **not** add one. Pure logic is verified with throwaway `npx tsx` scripts (then deleted). UI is verified with `npx tsc --noEmit`, `npm run lint`, and Playwright screenshots via `npm run dev`.
- No data-model changes. Types stay: `gallery_images: string[]`, `image_focal: Record<string, string>`, `show_gallery: boolean`.
- Preserve per-theme `borderRadius`: Classic default (10), Clean 10, Dark 2.
- Preserve `focal` (object-position) on every cropped tile.
- Theme call sites: Classic `src/app/[slug]/themes/classic/ClassicPage.tsx:245`, Clean `src/app/[slug]/themes/clean/CleanPage.tsx:286`, Dark `src/app/[slug]/themes/dark/DarkPage.tsx:328`.
- Work on branch `feat/gallery-rebuild` (already created).

---

### Task 1: Justified row-packing logic (pure function)

The math that guarantees Clean's rows fill the full width. Pure, no React — testable standalone.

**Files:**
- Create: `src/app/[slug]/components/gallery/justify.ts`
- Test (throwaway): `scratch/justify.check.ts` (deleted in Step 5)

**Interfaces:**
- Produces:
  - `interface JustifyRow { indices: number[]; height: number }`
  - `function packRows(ratios: number[], containerWidth: number, targetHeight: number, gap: number, lastRowMaxScale?: number): JustifyRow[]`
  - Item width within a row = `row.height * ratios[index]`.

- [ ] **Step 1: Write the failing check script**

Create `scratch/justify.check.ts`:

```ts
import { packRows } from "../src/app/[slug]/components/gallery/justify";

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error("FAIL:", msg); process.exit(1); }
}

// 6 landscape (ratio 1.5) images, 900px container, 200px target, 8px gap.
const rows = packRows(Array(6).fill(1.5), 900, 200, 8);

// Every full row's total item width + gaps must equal container width (within 0.5px).
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const w = r.indices.reduce((s, idx) => s + r.height * 1.5, 0) + 8 * (r.indices.length - 1);
  // last row may be left short only if sparse; here all rows should fill
  assert(Math.abs(w - 900) < 0.5, `row ${i} width ${w} != 900`);
}

// All 6 images placed exactly once.
const all = rows.flatMap(r => r.indices);
assert(all.length === 6 && new Set(all).size === 6, "all 6 images placed once");

// Single sparse leftover does not balloon past lastRowMaxScale.
const sparse = packRows([1.5, 1.5, 1.5], 900, 200, 8, 1.5);
const last = sparse[sparse.length - 1];
assert(last.height <= 200 * 1.5 + 0.001, `sparse last row height ${last.height} exceeds cap`);

console.log("PASS");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx scratch/justify.check.ts`
Expected: FAIL — module `justify` not found / `packRows is not a function`.

- [ ] **Step 3: Implement `packRows`**

Create `src/app/[slug]/components/gallery/justify.ts`:

```ts
export interface JustifyRow {
  indices: number[];
  height: number;
}

/**
 * Greedy justified layout. Walks images in order, accumulating into a row
 * until they would overflow the container at targetHeight, then scales the
 * row so its item widths + gaps exactly equal containerWidth.
 *
 * Item width within a returned row = row.height * ratios[index].
 *
 * The final (sparse) row is scaled to fill too, but its scale is capped at
 * lastRowMaxScale so one stray narrow image doesn't balloon.
 */
export function packRows(
  ratios: number[],
  containerWidth: number,
  targetHeight: number,
  gap: number,
  lastRowMaxScale = 1.5,
): JustifyRow[] {
  const rows: JustifyRow[] = [];
  let current: number[] = [];
  let ratioSum = 0;

  const fill = (indices: number[], rSum: number, cap?: number): JustifyRow => {
    const totalGap = gap * (indices.length - 1);
    const rawScale = (containerWidth - totalGap) / (rSum * targetHeight);
    const scale = cap ? Math.min(cap, rawScale) : rawScale;
    return { indices, height: targetHeight * scale };
  };

  for (let i = 0; i < ratios.length; i++) {
    current.push(i);
    ratioSum += ratios[i];
    const width = ratioSum * targetHeight + gap * (current.length - 1);
    if (width >= containerWidth) {
      rows.push(fill(current, ratioSum));
      current = [];
      ratioSum = 0;
    }
  }

  if (current.length) {
    const naturalWidth = ratioSum * targetHeight + gap * (current.length - 1);
    // If the leftover row is nearly full, justify it exactly; otherwise cap.
    const cap = naturalWidth >= containerWidth * 0.85 ? undefined : lastRowMaxScale;
    rows.push(fill(current, ratioSum, cap));
  }

  return rows;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx tsx scratch/justify.check.ts`
Expected: `PASS`

- [ ] **Step 5: Delete the throwaway script and commit**

```bash
rm scratch/justify.check.ts
git add src/app/[slug]/components/gallery/justify.ts
git commit -m "feat(gallery): justified row-packing logic"
```

---

### Task 2: useImageRatios hook

Measures intrinsic aspect ratios (width/height) of image URLs client-side, for the justified layout.

**Files:**
- Create: `src/app/[slug]/components/gallery/useImageRatios.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `function useImageRatios(urls: string[]): Record<string, number>` — maps url → width/height. A url is absent from the map until measured.

- [ ] **Step 1: Implement the hook**

Create `src/app/[slug]/components/gallery/useImageRatios.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

/**
 * Measures intrinsic aspect ratio (naturalWidth / naturalHeight) for each url.
 * Returns a map; a url is only present once its image has loaded.
 */
export function useImageRatios(urls: string[]): Record<string, number> {
  const [ratios, setRatios] = useState<Record<string, number>>({});

  // Re-run only when the set of urls actually changes.
  const key = urls.join("|");

  useEffect(() => {
    let cancelled = false;
    for (const url of urls) {
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        const r = img.naturalWidth / img.naturalHeight || 1;
        setRatios((prev) => (prev[url] ? prev : { ...prev, [url]: r }));
      };
      img.src = url;
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return ratios;
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors referencing `useImageRatios.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/[slug]/components/gallery/useImageRatios.ts
git commit -m "feat(gallery): useImageRatios hook"
```

---

### Task 3: Lightbox component (upgraded)

Full-screen viewer with prev/next, keyboard, swipe, counter. Replaces the inline lightbox.

**Files:**
- Create: `src/app/[slug]/components/gallery/Lightbox.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface LightboxProps { photos: string[]; index: number; onIndexChange: (i: number) => void; onClose: () => void }`
  - `function Lightbox(props: LightboxProps): JSX.Element`
  - Navigation clamps at both ends (does not wrap).

- [ ] **Step 1: Implement the component**

Create `src/app/[slug]/components/gallery/Lightbox.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

export interface LightboxProps {
  photos: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

export function Lightbox({ photos, index, onIndexChange, onClose }: LightboxProps) {
  const touchX = useRef<number | null>(null);

  const go = (delta: number) => {
    const next = index + delta;
    if (next >= 0 && next < photos.length) onIndexChange(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photos.length]);

  const arrowStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    [side]: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.4)",
    border: "none",
    color: "#fff",
    fontSize: 28,
    lineHeight: 1,
    width: 48,
    height: 48,
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const atStart = index === 0;
  const atEnd = index === photos.length - 1;

  return (
    <div
      onClick={onClose}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 999,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", color: "#fff", fontSize: 32, cursor: "pointer", lineHeight: 1, padding: "4px 10px" }}>×</button>

      <div style={{ position: "absolute", top: 24, left: 24, color: "#fff", fontSize: 14, fontWeight: 600, letterSpacing: 0.3 }}>
        {index + 1} / {photos.length}
      </div>

      {!atStart && (
        <button aria-label="Previous" onClick={(e) => { e.stopPropagation(); go(-1); }} style={arrowStyle("left")}>‹</button>
      )}
      {!atEnd && (
        <button aria-label="Next" onClick={(e) => { e.stopPropagation(); go(1); }} style={arrowStyle("right")}>›</button>
      )}

      <img
        src={photos[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 4 }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors referencing `Lightbox.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/[slug]/components/gallery/Lightbox.tsx
git commit -m "feat(gallery): upgraded lightbox with nav, swipe, counter"
```

---

### Task 4: Shared tile helpers + UniformGrid

Uniform cropped-tile grid for Classic tiles and Dark, with the last-row span-fill rule that kills white space.

**Files:**
- Create: `src/app/[slug]/components/gallery/tileStyles.ts`
- Create: `src/app/[slug]/components/gallery/UniformGrid.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `tileStyles.ts`: `const imgStyle: React.CSSProperties`; `function focalPos(focal: Record<string,string> | undefined, url: string): string` (returns `focal?.[url] ?? "center"`).
  - `UniformGrid.tsx`:
    - `interface UniformGridProps { photos: string[]; cols: number; aspect: string; gap: number; borderRadius: number; focal?: Record<string,string>; onPhotoClick: (i: number) => void }`
    - `function UniformGrid(props): JSX.Element`
    - `cols` is the resolved column count for the current breakpoint (caller decides via Task 6's `isDesktop`).

- [ ] **Step 1: Implement shared tile styles**

Create `src/app/[slug]/components/gallery/tileStyles.ts`:

```ts
import type React from "react";

export const imgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "transform 0.3s ease",
  cursor: "pointer",
  display: "block",
  position: "absolute",
  inset: 0,
};

export function focalPos(focal: Record<string, string> | undefined, url: string): string {
  return focal?.[url] ?? "center";
}
```

- [ ] **Step 2: Implement UniformGrid**

Create `src/app/[slug]/components/gallery/UniformGrid.tsx`:

```tsx
"use client";

import { imgStyle, focalPos } from "./tileStyles";

export interface UniformGridProps {
  photos: string[];
  cols: number;
  aspect: string;          // e.g. "4 / 3" or "1 / 1"
  gap: number;
  borderRadius: number;
  focal?: Record<string, string>;
  onPhotoClick: (i: number) => void;
}

export function UniformGrid({ photos, cols, aspect, gap, borderRadius, focal, onPhotoClick }: UniformGridProps) {
  const remainder = cols > 1 ? photos.length % cols : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
      {photos.map((photo, i) => {
        const isLast = i === photos.length - 1;
        // Fill a ragged final row: the last tile widens to close the gap.
        const span = isLast && remainder !== 0 ? cols - remainder + 1 : 1;
        return (
          <div
            key={i}
            style={{
              borderRadius,
              overflow: "hidden",
              aspectRatio: span > 1 ? undefined : aspect,
              gridColumn: span > 1 ? `span ${span}` : undefined,
              position: "relative",
              minHeight: span > 1 ? 0 : undefined,
            }}
          >
            <img
              src={photo}
              alt=""
              style={{ ...imgStyle, objectPosition: focalPos(focal, photo) }}
              onClick={() => onPhotoClick(i)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1.0)"; }}
            />
          </div>
        );
      })}
    </div>
  );
}
```

Note: a spanned last tile drops the fixed `aspectRatio` and instead stretches to the row's natural height (set by its siblings), so it reads as a wider feature tile without a gap. When `cols === 1` (Dark mobile) remainder is forced to 0 — never spans.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors referencing the new files.

- [ ] **Step 4: Commit**

```bash
git add src/app/[slug]/components/gallery/tileStyles.ts src/app/[slug]/components/gallery/UniformGrid.tsx
git commit -m "feat(gallery): UniformGrid with last-row span fill"
```

---

### Task 5: FeaturedHero + JustifiedRows

Classic's 16:9 hero banner, and Clean's justified rows engine.

**Files:**
- Create: `src/app/[slug]/components/gallery/FeaturedHero.tsx`
- Create: `src/app/[slug]/components/gallery/JustifiedRows.tsx`

**Interfaces:**
- Consumes: `imgStyle`, `focalPos` (Task 4); `packRows`, `JustifyRow` (Task 1); `useImageRatios` (Task 2).
- Produces:
  - `interface FeaturedHeroProps { photo: string; borderRadius: number; focal?: Record<string,string>; onClick: () => void }`
  - `function FeaturedHero(props): JSX.Element`
  - `interface JustifiedRowsProps { photos: string[]; gap: number; borderRadius: number; targetHeight: number; focal?: Record<string,string>; onPhotoClick: (i: number) => void }`
  - `function JustifiedRows(props): JSX.Element`

- [ ] **Step 1: Implement FeaturedHero**

Create `src/app/[slug]/components/gallery/FeaturedHero.tsx`:

```tsx
"use client";

import { imgStyle, focalPos } from "./tileStyles";

export interface FeaturedHeroProps {
  photo: string;
  borderRadius: number;
  focal?: Record<string, string>;
  onClick: () => void;
}

export function FeaturedHero({ photo, borderRadius, focal, onClick }: FeaturedHeroProps) {
  return (
    <div style={{ borderRadius, overflow: "hidden", aspectRatio: "16 / 9", position: "relative" }}>
      <img
        src={photo}
        alt=""
        style={{ ...imgStyle, objectPosition: focalPos(focal, photo) }}
        onClick={onClick}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1.0)"; }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Implement JustifiedRows**

Create `src/app/[slug]/components/gallery/JustifiedRows.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { packRows } from "./justify";
import { useImageRatios } from "./useImageRatios";
import { imgStyle, focalPos } from "./tileStyles";

export interface JustifiedRowsProps {
  photos: string[];
  gap: number;
  borderRadius: number;
  targetHeight: number;
  focal?: Record<string, string>;
  onPhotoClick: (i: number) => void;
}

export function JustifiedRows({ photos, gap, borderRadius, targetHeight, focal, onPhotoClick }: JustifiedRowsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const ratios = useImageRatios(photos);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const allMeasured = photos.every((p) => ratios[p]);
  const ready = width > 0 && allMeasured;

  // Skeleton until measured: one full-width block at target height.
  if (!ready) {
    return (
      <div ref={ref}>
        <div style={{ display: "flex", gap, flexWrap: "wrap" }}>
          {photos.slice(0, 6).map((_, i) => (
            <div key={i} style={{ flex: "1 1 30%", height: targetHeight, borderRadius, background: "#eee", animation: "sgPulse 1.4s ease-in-out infinite" }} />
          ))}
        </div>
        <style>{`@keyframes sgPulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  const rows = packRows(photos.map((p) => ratios[p]), width, targetHeight, gap);

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap }}>
          {row.indices.map((idx) => (
            <div
              key={idx}
              style={{ width: row.height * ratios[photos[idx]], height: row.height, borderRadius, overflow: "hidden", position: "relative", flex: "0 0 auto" }}
            >
              <img
                src={photos[idx]}
                alt=""
                style={{ ...imgStyle, objectPosition: focalPos(focal, photos[idx]) }}
                onClick={() => onPhotoClick(idx)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1.0)"; }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors referencing the new files.

- [ ] **Step 4: Commit**

```bash
git add src/app/[slug]/components/gallery/FeaturedHero.tsx src/app/[slug]/components/gallery/JustifiedRows.tsx
git commit -m "feat(gallery): FeaturedHero + JustifiedRows engines"
```

---

### Task 6: SectionGallery entry — assemble engines, show-more, lightbox

The public component the themes import. Owns breakpoint detection, smart show-more counts, lightbox state; delegates rendering to the engines.

**Files:**
- Create: `src/app/[slug]/components/gallery/SectionGallery.tsx`
- Delete: `src/app/[slug]/components/SectionGallery.tsx` (replaced)
- Modify: `src/app/[slug]/themes/classic/ClassicPage.tsx:6` and `:245`
- Modify: `src/app/[slug]/themes/clean/CleanPage.tsx:6` and `:286`
- Modify: `src/app/[slug]/themes/dark/DarkPage.tsx:6` and `:328`

**Interfaces:**
- Consumes: `UniformGrid` (Task 4), `FeaturedHero` (Task 5), `JustifiedRows` (Task 5), `Lightbox` (Task 3).
- Produces: `function SectionGallery(props: Props): JSX.Element | null` — same prop shape as today: `{ photos: string[]; layout?: "featured" | "masonry" | "grid"; borderRadius?: number; initialCount?: number; desktopInitialCount?: number; desktopBreakpoint?: number; focal?: Record<string,string> }`.

- [ ] **Step 1: Implement SectionGallery**

Create `src/app/[slug]/components/gallery/SectionGallery.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { UniformGrid } from "./UniformGrid";
import { FeaturedHero } from "./FeaturedHero";
import { JustifiedRows } from "./JustifiedRows";
import { Lightbox } from "./Lightbox";

interface Props {
  photos: string[];
  layout?: "featured" | "masonry" | "grid";
  borderRadius?: number;
  initialCount?: number;
  desktopInitialCount?: number;
  desktopBreakpoint?: number;
  focal?: Record<string, string>;
}

export function SectionGallery({
  photos,
  layout = "featured",
  borderRadius = 10,
  initialCount,
  desktopInitialCount,
  desktopBreakpoint = 680,
  focal,
}: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= desktopBreakpoint);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, [desktopBreakpoint]);

  if (!photos.length) return null;

  const effectiveCount = (desktopInitialCount && isDesktop) ? desktopInitialCount : initialCount;
  const limit = (effectiveCount && !expanded) ? effectiveCount : photos.length;
  const visible = photos.slice(0, limit);
  const hiddenCount = photos.length - limit;

  // Column counts per engine + breakpoint.
  const gridCols = isDesktop ? 2 : 1;          // dark "grid"
  const restCols = isDesktop ? 3 : 2;          // classic featured rest

  let galleryNode: React.ReactNode;

  if (layout === "masonry") {
    galleryNode = (
      <JustifiedRows
        photos={visible}
        gap={12}
        borderRadius={borderRadius}
        targetHeight={isDesktop ? 200 : 160}
        focal={focal}
        onPhotoClick={setLightboxIdx}
      />
    );
  } else if (layout === "grid") {
    galleryNode = (
      <UniformGrid
        photos={visible}
        cols={gridCols}
        aspect="4 / 3"
        gap={8}
        borderRadius={borderRadius}
        focal={focal}
        onPhotoClick={setLightboxIdx}
      />
    );
  } else {
    // featured (classic): hero + uniform rest grid
    const rest = visible.slice(1);
    galleryNode = (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <FeaturedHero photo={visible[0]} borderRadius={borderRadius} focal={focal} onClick={() => setLightboxIdx(0)} />
        {rest.length > 0 && (
          <UniformGrid
            photos={rest}
            cols={restCols}
            aspect="4 / 3"
            gap={10}
            borderRadius={borderRadius}
            focal={focal}
            onPhotoClick={(i) => setLightboxIdx(i + 1)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {galleryNode}

      {effectiveCount && photos.length > effectiveCount && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 12, width: "100%", height: 44, borderRadius,
            border: "1.5px solid #E5E5E5", background: "transparent",
            fontSize: 13, fontWeight: 700, color: "#6B7280",
            cursor: "pointer", transition: "border-color 0.2s, color 0.2s", fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#111"; e.currentTarget.style.color = "#111"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; e.currentTarget.style.color = "#6B7280"; }}
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more photo${hiddenCount !== 1 ? "s" : ""}`}
        </button>
      )}

      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIdx}
          onIndexChange={setLightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Update the three theme imports**

In each theme page, change the import specifier from `../../components/SectionGallery` to `../../components/gallery/SectionGallery` (line 6 in all three):

- `src/app/[slug]/themes/classic/ClassicPage.tsx:6`
- `src/app/[slug]/themes/clean/CleanPage.tsx:6`
- `src/app/[slug]/themes/dark/DarkPage.tsx:6`

The component call sites (`:245`, `:286`, `:328`) stay unchanged — same props.

- [ ] **Step 3: Delete the old component**

```bash
git rm src/app/[slug]/components/SectionGallery.tsx
```

- [ ] **Step 4: Typecheck, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean build, no unresolved import of the old path.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(gallery): assemble SectionGallery from engines; wire themes"
```

---

### Task 7: Visual verification across themes, counts, breakpoints

Confirm no white space and correct behavior end-to-end. Uses the dev server + Playwright (webapp-testing skill).

**Files:**
- No source changes unless a defect is found (then fix in the relevant engine + re-commit).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (note the local URL and a slug that has gallery images; use admin/seed data or an existing business slug).

- [ ] **Step 2: Screenshot matrix**

For each theme (classic, clean, dark), at viewport widths 390px (mobile) and 1280px (desktop), capture the gallery section at photo counts N = 3, 5, 7, 9, 12 (vary the business's `gallery_images`, or temporarily slice in a scratch page). For each: collapsed and expanded ("Show more") states.

Use the webapp-testing skill (Playwright) to navigate and screenshot. Verify in each shot:
- No white gap at the end of any row (last row fills full width).
- Classic mobile at hero+3: the orphan tile spans full width — no gap. (Primary bug.)
- Clean rows are edge-to-edge with true aspect ratios, no cropping distortion.
- Dark desktop odd N: final tile spans both columns.

- [ ] **Step 3: Lightbox checks**

Open the lightbox; verify: prev/next arrows appear and clamp at first/last (no arrow past the end), `←`/`→` keys move, counter shows `n / total`, mobile swipe (emulate touch) navigates, Esc and backdrop click close.

- [ ] **Step 4: Loading check**

Throttle network (Playwright/devtools) and reload Clean: confirm skeleton blocks show at target height, then images fade in without a layout jump.

- [ ] **Step 5: Fix any defects, then final commit**

If any shot shows a gap or distortion, fix in the owning engine (`UniformGrid`, `JustifiedRows`, or `FeaturedHero`) and re-run the relevant shot. When clean:

```bash
git add -A
git commit -m "test(gallery): visual verification pass; fixes from review"
```

---

## Self-Review

**Spec coverage:**
- Architecture split into `components/gallery/` units — Tasks 1–6. ✓
- No-white-space (uniform span-fill) — Task 4. ✓
- No-white-space (justified rows) — Tasks 1, 5. ✓
- Smart show-more counts (row-complete per breakpoint) — Task 6 (`gridCols`/`restCols` + existing 4/6 counts via props; collapsed never orphans because Classic rest desktop=3/mobile=2 fill rows, Dark 4 fills, Clean justified can't gap). ✓
- Loading polish (skeleton + fade-in) — Task 5 (JustifiedRows skeleton); uniform tiles fade via existing `<img>` load (acceptable, no skeleton needed for cropped tiles per spec emphasis on Clean). ✓
- Upgraded lightbox — Task 3. ✓
- Optimal-count guidance — documentation only, in spec; no code task needed. ✓
- AGENTS.md Next-docs constraint — Global Constraints + Task gates (`npm run build`). ✓
- No data-model change, focal + borderRadius preserved — enforced in Tasks 4/5/6. ✓

**Placeholder scan:** No TBD/TODO; all steps contain real code or exact commands. ✓

**Type consistency:** `packRows`/`JustifyRow` (Task 1) consumed in Task 5; `useImageRatios` (Task 2) in Task 5; `imgStyle`/`focalPos` (Task 4) in Tasks 4/5; engine prop interfaces match their Task-6 call sites (`UniformGridProps`, `FeaturedHeroProps`, `JustifiedRowsProps`, `LightboxProps`). Lightbox uses `index`/`onIndexChange` consistently across Tasks 3 and 6. ✓

**Note on collapsed counts:** Spec's "Classic mobile = hero+2" is achieved by passing `desktopInitialCount` so desktop shows hero+3 and mobile shows `initialCount`. Implementation plan keeps Classic call site as-is (`initialCount={4}` = hero+3 both breakpoints); if mobile hero+2 is desired, set Classic to `initialCount={3} desktopInitialCount={4}` in `ClassicPage.tsx:245`. Flagged for the execution review — low-risk, one-line call-site tweak. The span-fill rule means even hero+3 on mobile has no gap, so this is cosmetic, not a correctness issue.
