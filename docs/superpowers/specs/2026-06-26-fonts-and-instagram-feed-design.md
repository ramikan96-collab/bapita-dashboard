# Fonts + Live Instagram Feed — Design Spec

Date: 2026-06-26
Repo: bapita-dashboard (Next.js App Router, Supabase, Vercel)

## Goal

Two editable-per-business features, controllable from BOTH the barber settings page
(`src/app/(dashboard)/settings/page.tsx`) and the admin business form
(`src/app/(dashboard)/admin/businesses/_components/BusinessForm.tsx`):

1. **Font selection** — pick heading font + body font from a curated, Hebrew-capable list.
2. **Live Instagram feed** — paste a LightWidget embed once; toggle the gallery section to
   show the live IG feed instead of uploaded gallery images. Auto-updates with no further work.

Both must render on the three themes (classic / clean / dark) AND on any future ejected
custom page, in the existing visual style. No new "irrelevant" UI. Nothing existing breaks.
Israeli localization: Hebrew text must never break — chosen fonts must render Hebrew well.

## Non-goals

- No Instagram Graph API / OAuth / token-refresh infrastructure.
- No free-text arbitrary fonts (curated list only).
- No barber-facing widget setup instructions UI — the owner (Rami) does widget setup and
  pastes the embed. "Do it for me" model.

## Decisions (locked with user)

- **IG mechanism:** LightWidget embed iframe. Owner creates the per-account widget on
  lightwidget.com, pastes the embed link/ID into Bapita. The widget itself auto-pulls the
  latest posts forever — paste once, never touch again. No backend, no tokens.
- **Gallery vs IG:** same section slot. A `gallery_source` toggle picks which renders.
- **Fonts:** curated dropdown, heading + body chosen independently. All list entries render
  Hebrew natively. `'Heebo', sans-serif` appended as silent last-resort fallback only.
- **Two separate IG links:** existing `instagram_url` (profile, "follow us" icon) stays as-is;
  new `instagram_embed` holds the widget feed. Different jobs, never conflated.

## Data model

Add columns to `public.businesses` and fields to the `Business` type (`src/types/index.ts`):

```
heading_font    text   null                 -- e.g. "Frank Ruhl Libre"; null = theme default
body_font       text   null                 -- null = theme default
gallery_source  text   not null default 'images'   -- 'images' | 'instagram'
instagram_embed text   null                 -- LightWidget embed URL or widget id
```

No `show_instagram` column: the existing `show_gallery` already gates the section;
`gallery_source` only selects what renders inside it. `instagram_url` untouched.

Migration applied to the live Supabase project (force-dynamic page, no codegen types file
beyond `src/types/index.ts`). `page.tsx` SELECT list must add the four new columns.

## Font catalog (curated, Hebrew-capable)

Single source of truth, new file `src/app/[slug]/_shared/fonts.ts`:

```ts
export interface FontDef { name: string; query: string; } // query = css2 family param
export const FONT_CATALOG: FontDef[] = [
  { name: "Heebo",            query: "Heebo:wght@400;500;600;700;800" },
  { name: "Assistant",        query: "Assistant:wght@400;500;600;700;800" },
  { name: "Rubik",            query: "Rubik:wght@400;500;600;700" },
  { name: "Frank Ruhl Libre", query: "Frank+Ruhl+Libre:wght@400;500;700;900" },
  { name: "Secular One",      query: "Secular+One" },          // single weight
  { name: "Suez One",         query: "Suez+One" },             // single weight
  { name: "Varela Round",     query: "Varela+Round" },         // single weight
  { name: "Alef",             query: "Alef:wght@400;700" },
  { name: "David Libre",      query: "David+Libre:wght@400;500;700" },
  { name: "Karantina",        query: "Karantina:wght@300;400;700" },
];
export const HEBREW_FALLBACK = "'Heebo', sans-serif";
// helper: turn a chosen name (or null) + theme default into a CSS font-family string
export function resolveFont(chosen: string | null | undefined, themeDefault: string): string {
  if (!chosen) return themeDefault;
  return `'${chosen}', ${HEBREW_FALLBACK}`;
}
```

Per-font `query` carries only weights that actually exist, so the css2 request never 404s
(single-weight display fonts omit the `wght` axis).

## Components (shared, theme- and custom-page-agnostic)

New, in `src/app/[slug]/_shared/`:

1. **`FontLoader.tsx`** — `<FontLoader fonts={[headingName, bodyName]} />`. Filters nulls,
   dedupes, looks each up in `FONT_CATALOG`, renders one Google Fonts `<link>` (or a `<style>`
   `@import`, matching the theme pattern) requesting the union of needed families. Renders
   nothing when no overrides set (themes keep their own default `@import`). Safe to mount on
   any page including a custom ejected page.

2. **`InstagramFeed.tsx`** — `<InstagramFeed embed={instagram_embed} radius={n} />`.
   Renders the LightWidget iframe/script self-contained, styled to fill the section like the
   gallery grid (matching border radius per theme). Returns null when `embed` empty.
   Self-contained so it drops into a custom page unchanged.

## Render wiring (per theme: classic / clean / dark)

Each `*Page.tsx`:

- Compute near top:
  `const headingFont = resolveFont(business.heading_font, THEME_DEFAULT_HEADING);`
  `const bodyFont    = resolveFont(business.body_font,    THEME_DEFAULT_BODY);`
  where the THEME_DEFAULT_* are the strings the theme uses today (classic: Playfair / Heebo;
  clean: Plus Jakarta / Plus Jakarta; dark: Oswald / Inter).
- Replace the inline literal font strings with `headingFont` / `bodyFont`. Body = the root
  `<div>` `fontFamily` + body-ish UI text; heading = the decorative `fontFamily` spots
  (`Playfair Display` / `Oswald` etc.). Mechanical, value-only swap — no structural change.
- Mount `<FontLoader fonts={[business.heading_font, business.body_font]} />` inside the
  existing theme `<style>`/root so override families load.
- Gallery section: change the existing
  `show_gallery !== false && gallery_images?.length > 0 ? <SectionGallery/> : null`
  to:
  - if `show_gallery !== false` AND `gallery_source === 'instagram'` AND `instagram_embed`
    → `<InstagramFeed embed={...} radius={themeRadius} />`
  - else existing gallery condition (unchanged).
  The section heading/wrapper stays identical; only the inner content swaps.

## Editor UI (mirrored in settings page + admin BusinessForm)

Match existing field styling exactly (same label/input components already used in each file).
Place near the existing gallery / appearance controls — no new top-level section unless the
file already groups appearance settings; if so, extend that group.

- **Fonts:** two `<select>` dropdowns — "Heading font" and "Body font". Options = "Theme
  default" (value `""` → stored null) + `FONT_CATALOG` names. On change, save `heading_font`
  / `body_font` via the same save path the file already uses for other business fields.
- **Gallery source:** a toggle/segmented control (reuse whatever toggle pattern the file
  already has for `show_gallery` etc.) — "Gallery images" / "Instagram feed", stored in
  `gallery_source`.
- **Instagram embed:** text input, shown when `gallery_source === 'instagram'`, labeled as
  the LightWidget embed (with a one-line hint that it is NOT the profile URL). Stored in
  `instagram_embed`. The existing `instagram_url` field stays where it is.

## Failure / edge handling

- `gallery_source === 'instagram'` but `instagram_embed` empty → fall back to gallery images
  (or nothing if no images), never an empty broken section.
- Chosen font fails to load → `'Heebo', sans-serif` fallback renders Hebrew + Latin fine.
- Latin-only display font + Hebrew text → Hebrew glyphs fall back to Heebo automatically.
- LightWidget iframe blocked / slow → section shows the widget's own placeholder; page
  otherwise unaffected (isolated iframe).

## Testing (before final push)

- `npx tsc --noEmit` passes before every commit.
- `npm run build` succeeds.
- Local: render each theme with (a) default fonts, (b) overridden heading+body, in EN and HE
  — verify Hebrew renders, no tofu/boxes, layout intact.
- Toggle `gallery_source` images↔instagram per theme — verify swap, verify empty-embed
  fallback.
- Confirm admin BusinessForm and settings page both read+save all four fields identically.

## Commit batching

1. Migration + types + `page.tsx` SELECT.
2. Shared `fonts.ts` + `FontLoader` + `InstagramFeed`.
3. Theme wiring (classic, clean, dark) — fonts + gallery-source swap.
4. Editor UI in settings page + admin BusinessForm.

TS-check before each; push to main after each.
