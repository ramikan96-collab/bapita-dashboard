# Outreach Sheet Engine — Design

Date: 2026-08-31
Status: approved, not yet implemented
Repo: `book` (book.bapita.com, Vercel project `bapita-book`)

## Problem

Selling Bapita today means opening Google Maps, copying a business's details by
hand into `/admin/businesses/auto`, waiting for the LLM to build a draft site,
then writing a first message from scratch and finding the owner on WhatsApp or
Instagram. One prospect at a time, every step manual.

The goal is a repeatable outbound pipeline where a spreadsheet row containing
little more than a business name becomes an enriched record, a live pitch site,
and a ready to send personalized message.

This replaces the "Growth OS" idea for the first cohort of prospects.

## Shape

**The Google Sheet is the brain and the control surface.** Buttons live in the
Sheet, not in the admin panel. The Bapita app is a backend the Sheet calls.

Apps Script bound to the sheet adds a `Bapita` menu. Each menu action loops the
ticked rows, calls one endpoint per row via `UrlFetchApp.fetch()`, and writes
the JSON response back into that row's cells.

Rejected alternatives:

- **App pulls and pushes via the Sheets API.** Needs a service account and the
  Sheets API enabled, and the buttons would end up in the admin panel, which is
  exactly what this design is avoiding.
- **Published CSV in, Sheets API out.** Half of each, worst of both.

Consequences of the chosen shape:

- No OAuth, no service account, no Sheets API quota, no two way sync conflicts.
- Apps Script cannot carry a Supabase session cookie, so the endpoints need
  their own auth. See Trust boundary.
- Apps Script is the batch runner. It sequences rows, absorbing Groq's rate
  limit, and a partial batch is resumable because per row state lives in the
  sheet.

## Trust boundary

The three endpoints live under `/api/outreach/*` and authenticate with a
**bearer secret**, not the admin cookie session.

- Secret stored in Apps Script Script Properties, checked server side against
  an env var (`OUTREACH_SECRET`).
- Constant time comparison.
- Own rate limit, module level like `api/public/track`.
- `/api/outreach/*` must be **excluded from the `/api/admin*` middleware
  matcher** (`src/middleware.ts:408-419`), which gates on the admin email
  allowlist and would reject Apps Script.
- The endpoints force `status: "draft"`. They never accept a status from the
  caller and can never publish.

Blast radius if the secret leaks: an attacker can create draft businesses and
burn Groq quota. They cannot publish a site, read bookings, read customers, or
touch a live tenant.

## Sheet layout

One tab, `Prospects`. Headers in row 1; the script reads headers into a name to
index map, so columns can be reordered later without editing code. Letters
below are the default `Set up sheet` layout.

### You type

| Col | Name | Notes |
|---|---|---|
| A | `pick` | Checkbox. Every action runs on ticked rows only. |
| B | `query` | Business name plus city, or a Maps URL. What Places searches on. |
| C | `notes` | Vibe note. Feeds the LLM the same way `vibe` does in the existing intake. |
| D | `lang` | `he` or `en`. Blank means `he`. |
| E | `instagram` | Manual handle. See Known gaps. |

### Enrich writes

| Col | Name |
|---|---|
| F | `place_id` |
| G | `name` |
| H | `phone` |
| I | `address` |
| J | `website` |
| K | `rating` |
| L | `reviews_count` |
| M | `hours` |
| N | `segment` |
| O | `enriched_at` |

### Site writes

| Col | Name |
|---|---|
| P | `slug` |
| Q | `site_url` |
| R | `business_id` |
| S | `site_at` |

### Message writes

| Col | Name |
|---|---|
| T | `channel` |
| U | `message_he` |
| V | `message_en` |
| W | `action_link` |
| X | `message_at` |

### Always

| Col | Name |
|---|---|
| Y | `status` |
| Z | `last_error` |

### Status ladder

`new` → `enriched` → `site` → `ready` → `sent` → `replied` → `won` | `lost`

Plus two terminal-ish states the script sets: `error` (see `last_error`) and
`needs_channel` (no phone and no Instagram handle).

The script advances up to `ready`. You set `sent`, `replied`, `won`, `lost` by
hand from a dropdown that `Set up sheet` installs.

### Segment

Computed during enrichment from the Places `website` field. Drives which
message template is used.

- `no_web` — no website field. Strongest pitch.
- `ig_only` — website points at `instagram.com` or `linktr.ee`. Very common in
  this segment.
- `has_site` — a real site exists. Weakest pitch, different angle.

## Endpoints

All three are row at a time. All three return real HTTP status codes; the
script fetches with `muteHttpExceptions`, writes failures into `last_error`,
sets `status: error`, and continues to the next row. One bad row never kills a
batch.

```
POST /api/outreach/enrich
  { query, place_id? }
  → { place_id, name, phone, address, website, rating,
      reviews_count, hours, segment }

POST /api/outreach/site
  { place_id, query, notes, lang, slug?, force? }
  → { business_id, slug, site_url }

POST /api/outreach/message
  { place_id, name, segment, channel, site_url, rating,
    reviews_count, notes, lang }
  → { message, action_link, channel }
```

`message` is in the row's `lang` (Hebrew by default) and is what the script
writes into the `message_he` column. There is no English field in the response;
see English column below.

Separation is deliberate: enrich is free and factual, site generation costs an
LLM call, message generation costs an LLM call. You choose which prospects get
which.

### Idempotency

`POST /api/outreach/site` refuses when the row already carries a `business_id`,
unless `force: true`. Without this, one accidental re-run creates 40 duplicate
draft businesses and burns 40 slugs.

## Message composition

Six parts. The LLM writes exactly one of them.

1. **Greeting**, fixed — `היי, יום טוב.`
2. **Opener**, LLM, one or two sentences, referencing exactly one real fact
   from the enriched row.
3. **Value line**, fixed per segment.
4. **The site link.**
5. **Soft CTA**, fixed — `אם זה מעניין אתכם, אשמח לדבר ולספר עוד.`
6. **Signature**, fixed.

Example, `no_web`, Hebrew:

```
היי, יום טוב.
ראיתי את ספרות אבי בגוגל, 4.9 עם 127 ביקורות ועדיין בלי אתר.
בניתי לכם אתר תורים מוכן, אפשר לראות כאן:
book.bapita.com/studio-avi
לקוחות קובעים תור לבד, בלי הודעות וטלפונים בשעות העבודה.
אם זה מעניין אתכם, אשמח לדבר ולספר עוד.
רמי, Bapita
```

Only the second line varies per prospect.

### Segment changes the pitch, not only the wording

- `no_web` — you have no presence, here is one, free to look at.
- `ig_only` — your Instagram is the storefront, this is the booking layer under
  it. Never imply they have nothing; they clearly invested in Instagram.
- `has_site` — their site exists, so the angle is bookings, not existence.
  Lowest priority segment.

### LLM guardrails

The opener reaches a real business owner under your name.

- May use only fields present in the request payload. Explicitly forbidden from
  inventing services, prices, owner names, or claims about the business.
- Hard length cap; the opener is truncated server side if it overruns.
- **No dashes or hyphens**, Hebrew and English alike, per the standing copy
  rule. Enforced twice: in the prompt, and as a post process strip before the
  message is returned. The prompt alone will not hold.
- Reuses the existing Groq model chain with Ollama fallback from the intake
  route. No new provider.

### English column

`message_en` is a **`=GOOGLETRANSLATE` formula**, for your reading only.

- When the script writes `message_he` into `U5`, it also writes the literal
  string `=GOOGLETRANSLATE(U5,"he","en")` into `V5`. Per row, not
  `ARRAYFORMULA`, because `GOOGLETRANSLATE` vectorizes badly.
- **The script never reads `message_en`.** This is what makes the transient
  `Loading...` value harmless: it can never reach a sent message.
- Machine translation is not send quality. If English messages ever need to be
  sent, the opener must come from the LLM in both languages instead (one call,
  `{ opener_he, opener_en }`, roughly 40 extra tokens).

## Link mechanics

**WhatsApp.** Places returns `international_phone_number` like
`+972 54-123-4567`. Normalize to digits only: `972541234567`. A local `054…`
form drops the leading zero and gains a `972` prefix.

```
https://wa.me/972541234567?text=<encodeURIComponent(message)>
```

Prefill works on mobile and on WhatsApp Web. One click, message already typed.

**Instagram.** No prefill exists, and Apps Script cannot write the clipboard.
The row gives two cells: `message_he` to select and copy, and `action_link`
(`https://instagram.com/<handle>`) to open the profile. Two steps, unavoidable.

**Channel routing.** Phone present → `whatsapp`. Else handle present →
`instagram`. Else `status: needs_channel`. Typing a value into the `channel`
cell before running the action overrides the routing.

## Build phases

### Phase 1 — foundation

No sheet involved. Independently shippable.

- **Noindex fix.** Set `robots: { index: false }` whenever `status !== "live"`,
  in `src/app/[slug]/page.tsx:311` and `src/app/[slug]/[page]/page.tsx:192`.
  This generalizes the current `/^demo(-|$)/` slug special case.

  Context: `status` is selected on the public page but never gates rendering,
  so a draft business is already publicly viewable and indexable at its slug.
  Only the sitemap filters on `live`. Pitch sites for businesses that never
  signed up must not be crawlable under their real name. This fix also covers
  every existing draft.

- **`businesses.lead_source` column** (`'outreach'` or null). Migration in
  `docs/migrations/`. Without it the admin board fills with pitch drafts that
  are indistinguishable from real clients, because intake stamps every created
  business with the admin's own `owner_id`.

  **No anon column grant is needed**, because the column never enters the
  `src/app/[slug]/page.tsx` select. Stated explicitly because of the
  2026-08-22 outage documented in `CLAUDE.md`.

- **Extract `src/lib/intake/`** from `src/app/api/admin/intake/route.ts`: the
  system prompt, `callLLM` (Groq chain plus Ollama fallback),
  `buildBusinessPayload`, `insertBusinessWithServices`. The existing route
  becomes a thin caller. `/api/outreach/site` needs the same logic; the
  alternative is copy pasting 200 lines that will drift. Behavior must be
  identical, verified by generating one business before and after.

### Phase 2 — enrichment

- Extend `src/lib/google-places.ts` to return phone, website, hours, rating and
  review count, not only reviews. Text Search already exists in
  `src/app/actions/find-place-id.ts`; `GOOGLE_PLACES_API_KEY` is already
  configured.
- Add `src/lib/outreach/auth.ts` (bearer guard, constant time compare, rate
  limit).
- Add `POST /api/outreach/enrich`. Testable with curl alone.

### Phase 3 — site

`POST /api/outreach/site`. Calls the Phase 1 lib. Forces `status: "draft"` and
`lead_source: "outreach"`. Slug derived from the business name, collision
suffix, `isReservedSlug` check. Refuses when `business_id` already exists
unless `force`.

### Phase 4 — message

`src/lib/outreach/message.ts`: three segment templates in Hebrew, the LLM
opener, the dash strip post process, phone normalization to `972…`, wa.me link
construction. Then `POST /api/outreach/message`.

### Phase 5 — sheet

`scripts/sheets/Code.gs` committed to the repo, plus a setup README covering:
paste into Extensions → Apps Script, set the `BAPITA_OUTREACH_SECRET` Script
Property, run once to authorize.

`Bapita` menu items:

- `Set up sheet` — writes headers, the checkbox column, and the status dropdown.
- `Enrich selected`
- `Create sites for selected`
- `Write openers for selected`

Roughly 2 seconds of sleep between rows to stay under Groq's ~30 requests per
minute. Batches chunked against the Apps Script 6 minute execution limit, and
resumable because completed rows are skipped.

### Phase 6 — live run

Three real prospects, end to end.

## Verification

- Local `tsc` plus `npm run build` is the ship gate. No Chrome checks; live
  testing is done by the user.
- Phases 1 through 4 are curl testable before the sheet exists.
- After the noindex change, confirm a `live` slug still returns an indexable
  page and a `draft` slug does not.
- After the intake refactor, generate one business and diff the resulting row
  against a pre-refactor one.

## Known gaps and risks

- **Groq free tier daily token cap** is the real ceiling on batch size. Unknown
  until 50 prospects run in one day.
- **Places ToS limits long term caching** of Places fields (`place_id` is
  storable indefinitely, most other fields are not). Same exposure that already
  exists from manual copy pasting, now automated.
- **Bearer secret** can create drafts and burn LLM quota if leaked. It cannot
  publish, read bookings, or touch customers.
- **Slug changes on conversion** leave a dead old URL. No redirect handling
  exists. Minor.
- **No free way to find an Instagram handle** when Maps carries no Instagram
  link. Column E stays manual. No scraping.
- **`message_en` is machine translated** and not send quality, by explicit
  choice. Read only.
