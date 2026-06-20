# Demo Templates Overhaul + Auto-Intake — Design Spec

*2026-06-20 · bapita-dashboard*

## Goal

Make the barber demo experience premium and the admin workflow fast:

1. One demo URL per barber with a live theme switcher (kills the "clone to 3 slugs" step).
2. A professional, centered booking modal on desktop.
3. Fix the Dark-theme hours visibility bug.
4. Remove rot (`studio-avi`) and de-duplicate the themes so future polish is one-edit-everywhere.
5. Add a free, AI-assisted intake: paste messy info → Gemini fills every form tab → you review → save.

**Out of scope this round:** the "wow polish" animation pass (handed off — see Appendix B) and any paid AI.

---

## A — Foundation refactor (shared primitives)

**Problem:** Each theme copy-pastes ~150 lines: four icon SVGs (`IgIcon/WaIcon/FbIcon/TkIcon`), `useFadeInOnEnter`, `useCountUp` (Dark only), the fixed top-right `LangToggle`, and the footer (phone + social circles + "powered by"). Improving one means hand-fixing four files. This is exactly why `studio-avi` rotted.

**Change:** Create `src/app/[slug]/_shared/`:

- `icons.tsx` — exports `IgIcon`, `WaIcon`, `FbIcon`, `TkIcon`, `StarIcon` (the 5-point star path used in stars strips and rating). Same `{ size, color }` prop signature already in use.
- `useFadeInOnEnter.ts` — `(threshold = 0.12) => { ref, visible }`. Lift the existing identical hook.
- `useCountUp.ts` — lift from `DarkPage`.
- `LangToggle.tsx` — the fixed top-right EN/עב pill. Props: `lang`, `setLang`, and an optional `variant` for the two existing background treatments (light glass `rgba(0,0,0,0.48)` used by Clean/Classic vs the bordered glass used by Dark).
- `ThemeFooter.tsx` — phone link + social row + "powered by Bapita". Props: `business`, `accent`, `colors: { text, muted, surface, border }`, `socialShape: "circle" | "square"`, `socialBg`, `iconColor`, `footerLabel`, `brandLabel`. Covers all three current footer treatments (Clean round surface bubbles, Classic cream-2 circles, Dark accent squares) through props.

**Keep per-theme (signature elements, do NOT extract):** each theme's `SectionTitle` (Clean underline-grow, Classic underline, Dark wipe + letter-spacing), hero markup, palette constants, stats layout. These are what make the themes feel distinct.

Each theme imports from `_shared` and deletes its local copies. Net: ~150 fewer lines per theme, one source of truth for icons/hooks/footer/langtoggle.

**Acceptance:** All three themes render identically to before (visual parity), no local icon/hook/footer/langtoggle definitions remain in the theme files.

---

## B — Theme switcher (one-URL demo delivery)

**Mechanism:** `BookingShell` becomes the owner of the active theme:

```
const initialTheme = business.template_style ?? "classic";
const [previewTheme, setPreviewTheme] = useState(initialTheme);
```

The `switch` renders by `previewTheme` instead of `business.template_style`. Theme components are unchanged (they never read `template_style`).

**Switcher UI:** new `src/app/[slug]/_shared/DemoThemeSwitcher.tsx`.

- Renders **only when `business.status === "draft"`** and no custom page is active.
- Fixed, bottom-center, above the FloatingCTA stack (z-index below the booking overlay's `100`, e.g. `90`). A small rounded pill, 3 segments: `Clean · Classic · Dark`, active segment highlighted. Tiny caption above it: HE `בחר סגנון` / EN `Pick a style`.
- Tapping a segment calls `setPreviewTheme(key)` — instant client swap, no reload, no DB write.
- Hidden entirely when `status === "live"` (the theme is locked to whatever `template_style` you saved).

**Lock step (no new code):** in the admin `BusinessForm` you already have a `template_style` select and a draft/live toggle. After the barber picks, set `template_style` to that theme and flip `status` to `live`. Switcher disappears for visitors.

**Custom pages:** when a slug maps to a `CUSTOM_PAGES` entry, the switcher does not show (theme already decided).

**Acceptance:** Draft business → pill visible, switching themes changes the page live. Live business → no pill, renders saved `template_style`.

---

## C — Booking modal: centered on desktop

**Problem:** `BookingOverlay` is always a full-width bottom sheet (`insetInlineStart:0, insetInlineEnd:0, bottom:0`). On desktop it looks stretched and cheap.

**Change:** Split layout from dynamic styling. Move positioning/animation into an injected `<style>` with a class; keep the dynamic `background` as an inline style.

- Base / mobile (`< 768px`): bottom sheet as today — full width, `border-radius: 20px 20px 0 0`, `max-height: 92svh`, `slideUpSheet` animation.
- Desktop (`@media (min-width: 768px)`): centered card — `top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(440px, calc(100vw - 48px)); max-height: 88svh; border-radius: 20px;` with a `popIn` fade+scale animation (`opacity 0→1`, `scale 0.96→1`).
- Backdrop unchanged (`rgba(0,0,0,0.5)` + blur), still closes on click; `Esc` still closes.
- RTL safe: centered transform is direction-agnostic; keep `dir` inherited.

**Acceptance:** Mobile shows the bottom sheet; desktop shows a centered ~440px card. Both animate in. All four steps + success render correctly in both.

---

## D — Dark hours visibility fix

**Problem:** `SectionHours.tsx:40` hardcodes closed-day text `color: "rgba(0,0,0,0.35)"`. On the Dark theme (`#181818` panel) that is black-on-dark — invisible.

**Change:** Add `mutedColor?: string` to `SectionHours` props. Closed-day text uses `mutedColor ?? "rgba(0,0,0,0.35)"`. Pass it from each theme: Clean `P.muted` (`#6B7280`), Classic `rgba(34,21,16,0.45)`, Dark `D.muted` (`#888888`). The "today" accent-tint background is fine and stays.

**Acceptance:** Closed days and times are clearly legible on all three themes, especially Dark.

---

## F — Delete studio-avi

Remove `src/app/[slug]/customs/studio-avi.tsx` and its `CUSTOM_PAGES` entry + import in `BookingShell`. Keep the empty `CUSTOM_PAGES` record and the explanatory comment so future per-barber customs are still easy to register. It is a stale, English-only, pre-RTL fork of Classic — pure drift risk.

**Acceptance:** App builds, `studio-avi` slug (unused) falls through to the `template_style` switch like any other business.

---

## F.1 — Full custom page per barber (capability preserved)

Deleting `studio-avi` removes a stale file, **not** the ability to fully hand-customize a barber. The `CUSTOM_PAGES` registry in `BookingShell` stays. Recipe to bespoke-customize one barber later (off-template, edit anything):

1. Copy the theme he picked, e.g. `themes/dark/DarkPage.tsx`, into `customs/<his-slug>.tsx`; rename the component (e.g. `RamiBarberPage`).
2. Register it in `BookingShell`'s `CUSTOM_PAGES`: `"<his-slug>": RamiBarberPage`.
3. Edit that file as freely as you want — it now owns that slug; the template switch no longer applies to him.

After the A refactor, a custom starts from a *current* theme (shared primitives, RTL, reviews, stats) — a better starting point than the old `studio-avi` was. The theme switcher does not render for a slug that has a custom page (theme already decided).

### F.2 — Eject flow (admin button + script)

A custom page is a `.tsx` component, automatically connected to bookings/Supabase/dashboard because it reuses the shared `BookingOverlay` and platform components. Vercel's runtime filesystem is read-only, so file generation runs **locally via a script** that the admin triggers by copy-pasting commands. No GitHub token, no secrets.

**Script:** `scripts/eject-page.ts`, run as `npm run eject <slug> --from <theme>`:
1. Copies `themes/<theme>/<Theme>Page.tsx` → `customs/<slug>.tsx`, renames the exported component to a PascalCase name from the slug (e.g. `rami-barber` → `RamiBarberPage`).
2. Idempotently registers it in `BookingShell`'s `CUSTOM_PAGES` (adds the import + map entry; no-op if already present).
3. Prints a confirmation + the file path.

Add `"eject": "tsx scripts/eject-page.ts"` (or node-compatible runner already in the project) to `package.json` scripts.

**Admin UI — "Eject to custom page" button** on the `BusinessForm` (edit mode), near the `template_style` select. Opens a panel/modal pre-filled with this business's `slug` and current `template_style`. The panel shows **clearly numbered steps, each with its own Copy button**, kept short:

1. `cd /Users/admin/Desktop/bapita-dashboard`
2. `npm run eject <slug> --from <template_style>`
3. `git add -A && git commit -m "feat: custom page for <slug>" && git push`

Then a final button **"Copy Claude Code prompt"** that copies a ready prompt, e.g.:

> Customize the booking page at `src/app/[slug]/customs/<slug>.tsx` for the business "<name>". Keep it wired to the platform: do not change the booking flow — keep importing and using `BookingOverlay` and the shared section components, keep RTL + EN/HE support and the lang toggle. Make the design bespoke and premium for this business. Start by reading the file and the shared primitives in `src/app/[slug]/_shared/`, then propose changes.

Each step and the prompt are copy-to-clipboard. The admin runs steps 1–3 in order, then pastes the prompt into Claude Code to start customizing. The custom file owns the slug from then on (template switch + theme switcher no longer apply to it).

## G — Template count: stay at 3

Clean (light/minimal), Classic (warm/traditional), Dark (bold). Covers the barber aesthetic spectrum. With B's switcher + A's primitives a 4th is a ~1hr add later if a real barber profile needs it. No 4th built speculatively.

---

## H — Auto-intake (Gemini, free)

### Flow

1. Admin → Businesses page. New button **`✨ Auto-create`**, placed **between** `↓ CSV` and `+ Add Business`.
2. Opens intake screen `/admin/businesses/auto`:
   - **Slug** (you type — it's the URL).
   - **Language**: Hebrew (default) / English radio.
   - **Paste box** (large textarea): "IG bio, service list, Google Maps text (hours, address, phone, rating, reviews) — paste it all, messy is fine."
   - **Vibe / notes** (optional input): e.g. `small neighborhood barber, no socials` / `small but fancy women's salon`.
   - Button **`Generate with Gemini`**.
3. POST `/api/admin/intake` with `{ slug, lang, raw, vibe }`.
4. Route calls Gemini `gemini-2.5-flash` with the prompt below, gets strict JSON, validates it, then **inserts a draft business row + its services + its reviews** via Supabase service role (mirrors the existing `/api/admin/delete-business` service-role pattern). Returns `{ id }`.
5. Client redirects to `/admin/businesses/{id}` — the **existing edit form**, now prefilled from the row it just created. You review every tab, **upload hero + gallery photos** (existing uploader), tweak prices, then **Save**.

Nothing is published automatically: the row is `status: "draft"`. Drafts are viewable at their slug (intended — that's the demo) and show the theme switcher.

**Why create-then-edit instead of prefill-in-memory:** `BusinessForm` only prefills via its edit-mode DB load. Creating a draft row and redirecting to edit reuses that tested path with zero new prefill plumbing. Tradeoff: abandoning the review leaves a junk draft you can delete — acceptable.

### What it fills (every tab it can)

- **Profile:** `name`, `name_he`, `tagline`, `tagline_he`, `about_text`, `about_text_he`, `phone`, `address`, `instagram_url`, `facebook_url`, `tiktok_url`, `whatsapp_number`, `google_maps_url`, `google_review_link`, `accent_color` (a tasteful hex suggestion that fits the vibe), `template_style` (best-fit of clean/classic/dark), `default_lang` (from the language choice).
- **Services:** array of `{ name, name_he, duration, price, description? }`. If prices/durations are not stated, it estimates sensible Israeli-market values and they remain for you to correct.
- **Hours:** parse into the `BusinessHours` shape if present in the paste; otherwise leave the form's `DEFAULT_HOURS`.
- **Reviews:** parse any pasted Google reviews into `google_reviews: { id, author, rating, text, date }[]`; `show_reviews` stays `true` (default). If a rating/review count is mentioned, also set `stat_rating`.
- **Stats:** `stat_years`, `stat_clients`, `stat_rating` when derivable; else leave blank.

Not touched by AI: photos (you upload), slug (you typed), plan fields.

### Gemini prompt (server-side, system + user)

System instruction (verbatim intent):

> You are a senior brand copywriter and data extractor for Bapita, which builds booking websites for Israeli appointment businesses (barbershops, salons, nail/beauty studios). You receive messy, partial notes about ONE business and return a single strict JSON object matching the provided schema. Rules:
> - Extract every fact present (name, services, prices, hours, phone, address, socials, reviews, rating).
> - When copy is missing (tagline, about), WRITE it — specific, warm, on-brand, never generic. Never output filler like "Welcome to our shop" or "Quality service you can trust". Reference the vibe note and any real detail (location, specialty, gender focus, fancy vs neighborhood).
> - Provide Hebrew AND English for name, tagline, about. If only one language is given, translate naturally (not literally).
> - For services with no stated price/duration, estimate realistic Israeli-market values; never invent services that were not implied.
> - Parse pasted reviews into the reviews array with author, 1–5 rating, text, and a display date string.
> - Pick template_style: "clean" (modern/minimal/women's salons), "classic" (warm/traditional barbers), "dark" (bold/masculine/edgy). Suggest accent_color as a hex that suits the vibe.
> - Output ONLY the JSON object. No markdown, no commentary.

User message: the schema (as JSON), then `lang`, `vibe`, and the `raw` paste.

Use Gemini JSON mode (`responseMimeType: "application/json"`) with a `responseSchema` so parsing is reliable. Validate server-side; on malformed output, return a 422 with the raw text so the admin can retry or fall back to manual.

### Output JSON schema (route contract)

```json
{
  "name": "string", "name_he": "string",
  "tagline": "string", "tagline_he": "string",
  "about_text": "string", "about_text_he": "string",
  "phone": "string", "address": "string",
  "instagram_url": "string", "facebook_url": "string",
  "tiktok_url": "string", "whatsapp_number": "string",
  "google_maps_url": "string", "google_review_link": "string",
  "accent_color": "string", "template_style": "clean|classic|dark",
  "services": [{ "name": "string", "name_he": "string", "duration": 30, "price": 60, "description": "string" }],
  "business_hours": { "sunday": {"open": true, "start": "09:00", "end": "17:00" }, "... all 7 days": {} },
  "google_reviews": [{ "author": "string", "rating": 5, "text": "string", "date": "string" }],
  "stat_years": 0, "stat_clients": 0, "stat_rating": "4.9"
}
```

The route maps this onto the `businesses` insert (string `slug`/`lang`/`status:"draft"` from the request, `show_reviews:true`, generated `id`s for reviews via `crypto.randomUUID()`), inserts `services` rows with `display_order` and `active:true`, leaves missing fields null/default.

### Env

`GEMINI_API_KEY` — already added to Vercel by the user. Pull into local `.env.local` (see Implementation note). Route reads `process.env.GEMINI_API_KEY`; if absent, returns a clear 500 telling the admin the key is missing.

### Security

Intake route is admin-only — reuse the same admin guard the existing `/api/admin/*` routes use (service-role key stays server-side; verify the caller is the admin session before inserting). HTML/text from Gemini is treated as data, escaped on render by the existing form/themes.

**Acceptance:** Pasting a Google Maps blob (or just a vibe line) produces a draft business whose Profile/Services/Hours/Reviews tabs are populated with specific, non-generic content; you add photos and save; the demo URL works with the switcher.

---

## Implementation notes

- Local env: run `vercel env pull` to a temp file, extract `GEMINI_API_KEY`, append to `.env.local` only if missing (do not clobber existing keys). If the key was added to Production-only on Vercel, also enable it for the Development environment (or paste the value manually).
- Order of work: **A → D → F → C → B → H** (refactor first so B/H build on shared primitives; H last as the biggest piece).
- No DB migration required — `status`, `template_style`, `google_reviews`, `show_reviews` all already exist.

## Build order checklist

- [ ] A — `_shared/` primitives; themes consume them; visual parity
- [ ] D — `SectionHours` `mutedColor`; Dark legible
- [ ] F — delete `studio-avi` + `CUSTOM_PAGES` entry
- [ ] C — responsive `BookingOverlay` (sheet mobile / centered desktop)
- [ ] B — `previewTheme` in `BookingShell` + `DemoThemeSwitcher` (draft-only)
- [ ] H — `✨ Auto-create` button, `/admin/businesses/auto` screen, `/api/admin/intake` route, Gemini wiring, create-draft-then-redirect-to-edit
- [ ] F.2 — `scripts/eject-page.ts` + `npm run eject`; "Eject to custom page" panel on `BusinessForm` (steps + copy buttons + Claude Code prompt)
- [ ] Pull `GEMINI_API_KEY` into `.env.local`
- [ ] Build passes, manual smoke on one draft business
- [ ] Commit + push

---

## Appendix A — Files touched

| File | Change |
|---|---|
| `src/app/[slug]/_shared/*` | NEW: icons, hooks, LangToggle, ThemeFooter, DemoThemeSwitcher |
| `src/app/[slug]/themes/{clean,classic,dark}/*` | consume `_shared`, drop dup |
| `src/app/[slug]/BookingShell.tsx` | `previewTheme` state, render switcher, drop studio-avi |
| `src/app/[slug]/booking/BookingOverlay.tsx` | responsive centered/sheet |
| `src/app/[slug]/components/SectionHours.tsx` | `mutedColor` prop |
| `src/app/[slug]/customs/studio-avi.tsx` | DELETE |
| `src/app/(dashboard)/admin/businesses/page.tsx` | `✨ Auto-create` button (middle) |
| `src/app/(dashboard)/admin/businesses/auto/page.tsx` | NEW intake screen |
| `src/app/api/admin/intake/route.ts` | NEW Gemini route |
| `src/app/(dashboard)/admin/businesses/_components/BusinessForm.tsx` | NEW: "Eject to custom page" panel (steps + copy + Claude prompt) |
| `scripts/eject-page.ts` + `package.json` | NEW eject script + `npm run eject` |
| `.env.local` | add `GEMINI_API_KEY` |

---

## Appendix B — "Wow polish" handoff prompt (separate chat, do NOT build here)

> **Task: Wow-polish pass on the 3 Bapita booking themes.**
>
> Repo: `/Users/admin/Desktop/bapita-dashboard`. Themes: `src/app/[slug]/themes/{clean,classic,dark}/*`. Shared primitives live in `src/app/[slug]/_shared/`.
>
> Goal: make all three demo pages feel more premium, alive, and fast — while staying minimal, elegant, modern, professional. Subtle over flashy. 60fps only; no jank, no layout shift, respect `prefers-reduced-motion`.
>
> Ideas (pick what fits each theme's character, keep them distinct):
> - Hero: gentle parallax / scroll-linked fade or scale; image lazy-reveal already exists — refine timing.
> - Section entrances: refine the existing `useFadeInOnEnter` staggers; add subtle directional reveals per theme.
> - Buttons/cards: tasteful micro-interactions (press, hover lift, accent sweeps) — Dark can be boldest, Clean the most restrained.
> - Smooth scrolling, snappy overlay open/close.
> - Keep payload light; prefer CSS/transform/opacity over JS animation libs.
>
> Constraints: do NOT homogenize the three looks — each keeps its signature `SectionTitle`, hero, palette. Reuse/extend `_shared` so improvements apply across themes where shared. No new heavy dependencies. Test on mobile + desktop, EN + HE (RTL).
>
> Start by reading the three theme files and `_shared/`, propose the per-theme polish list, then implement.
