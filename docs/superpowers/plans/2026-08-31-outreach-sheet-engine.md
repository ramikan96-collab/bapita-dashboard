# Outreach Sheet Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a Google Sheet row containing little more than a business name into an enriched record, a live draft pitch site, and a ready to send personalized WhatsApp or Instagram message.

**Architecture:** A Google Sheet with bound Apps Script is the control surface and the batch runner. It calls three stateless, row-at-a-time endpoints under `/api/outreach/*` on book.bapita.com and writes the JSON responses back into the row's cells. The endpoints authenticate with a bearer secret (not the admin cookie session), force `status: "draft"`, and share the LLM/business-creation logic that is extracted out of the existing admin intake route in Task 3.

**Tech Stack:** Next.js 16.2.7 App Router route handlers, Supabase (service-role client), Groq via the `openai` SDK with an Ollama fallback, Google Places API (Text Search + Details), Google Apps Script.

**Spec:** `docs/superpowers/specs/2026-08-31-outreach-sheet-engine-design.md`

## Global Constraints

- **Ship gate is `npx tsc --noEmit` plus `npm run build`, run locally.** No Chrome checks. The user tests live himself.
- **No dashes or hyphens in any customer facing copy**, Hebrew and English alike. This includes every generated message. Enforced in the LLM prompt AND by a server-side strip; the prompt alone will not hold.
- **This repo has no test runner.** Executable checks go in `scripts/verify-*.ts`, run with `npx tsx`, following the existing `scripts/verify-stay-logic.ts` pattern (a `check(name, actual, expected)` helper, a failure counter, `process.exit(failures === 0 ? 0 : 1)`). Route handlers are verified with `curl`.
- **Before writing any migration that touches an index, verify the live index definition against `pg_indexes` first.** `CLAUDE.md` has been wrong about `bookings_slot_unique` before. No task in this plan touches an index; if one grows to, this rule applies.
- **Adding a column to the `src/app/[slug]/page.tsx` select requires a matching `grant select (col) on public.businesses to anon`**, or every public tenant page 404s at once (the 2026-08-22 outage). The `lead_source` column in Task 2 never enters that select, so **no grant is needed** for it. Task 1 does add `status` to the *metadata* select on that page, but `status` is already in the anon column allowlist (it is already selected at `src/app/[slug]/page.tsx:104` in production), so that needs no new grant either.
- **The `/api/outreach/*` endpoints force `status: "draft"`.** They never accept a status from the caller and can never publish.
- **`GROQ_MODELS` order is load-bearing.** Groq retires model IDs without notice. Never edit that list without checking `GET https://api.groq.com/openai/v1/models`.
- Commit after every task. Batch the pushes: commit per task, push once at the end of a phase.

---

## File Structure

**Phase 1 — foundation (shippable on its own, no sheet involved)**

| File | Responsibility |
|---|---|
| `src/lib/noindex.ts` (create) | One predicate: may this slug be indexed? Generalizes the `/^demo(-|$)/` special case to "anything not `live`". |
| `src/app/[slug]/page.tsx` (modify) | Uses the predicate in `generateMetadata`; adds `status` to that function's select. |
| `src/app/[slug]/[page]/page.tsx` (modify) | Uses the predicate in `generateMetadata`. `status` is already in `BUSINESS_COLUMNS`. |
| `docs/migrations/2026-08-31-lead-source.sql` (create) | `businesses.lead_source text` nullable. No anon grant. |
| `src/types/index.ts` (modify) | `lead_source?: string \| null` on `Business`. |
| `src/lib/intake/prompt.ts` (create) | `SYSTEM_INSTRUCTION`, `GROQ_MODELS`, `OLLAMA_MODEL`, `buildIntakeUserMessage`. |
| `src/lib/intake/llm.ts` (create) | `hasLlmProvider`, `callLLM`, `generateBusinessDraft` (call + JSON parse), `LlmJsonError`. |
| `src/lib/intake/payload.ts` (create) | `BRAND_ACCENT`, `DEFAULT_HOURS`, `buildBusinessPayload`. Pure, no I/O. |
| `src/lib/intake/insert.ts` (create) | `insertBusinessWithServices` — the two service-role writes. |
| `src/lib/intake/index.ts` (create) | Re-export barrel. |
| `src/app/api/admin/intake/route.ts` (modify) | Becomes a thin caller: auth, validate, delegate. |
| `scripts/verify-outreach.ts` (create) | Executable checks for every pure function this plan adds. Grows task by task. |
| `package.json` (modify) | `"verify:outreach": "npx tsx scripts/verify-outreach.ts"`. |

**Phase 2 — enrichment**

| File | Responsibility |
|---|---|
| `src/lib/google-places.ts` (modify) | Add `searchPlaceByQuery`, `fetchPlaceProfile`, `extractPlaceIdFromUrl`. Existing `fetchPlaceData` / `fetchPlaceReviews` untouched. |
| `src/lib/outreach/auth.ts` (create) | Bearer guard, constant time compare, module-level rate limit. |
| `src/lib/outreach/segment.ts` (create) | `segmentFor(website)` → `no_web` \| `ig_only` \| `has_site`. Pure. |
| `src/app/api/outreach/enrich/route.ts` (create) | `POST` — query in, place profile plus segment out. |
| `src/middleware.ts` (modify) | Exempt `/api/outreach` from the auth resolution in `needsAuth`. |

**Phase 3 — site**

| File | Responsibility |
|---|---|
| `src/lib/outreach/slug.ts` (create) | `deriveSlug(name)`, `pickFreeSlug(base)`. Pure derivation plus one existence query per candidate. |
| `src/app/api/outreach/site/route.ts` (create) | `POST` — creates the draft business via the Phase 1 intake lib. |

**Phase 4 — message**

| File | Responsibility |
|---|---|
| `src/lib/outreach/message.ts` (create) | Segment templates, opener prompt, `stripDashes`, `normalizePhone`, `waLink`, `composeMessage`. |
| `src/app/api/outreach/message/route.ts` (create) | `POST` — LLM opener plus fixed parts, returns message + action link + channel. |

**Phase 5 — sheet**

| File | Responsibility |
|---|---|
| `scripts/sheets/Code.gs` (create) | The whole Apps Script: menu, header map, three batch runners. |
| `scripts/sheets/README.md` (create) | Install and authorize steps. |

---

## Task 1: Noindex every business that is not live

**Files:**
- Create: `src/lib/noindex.ts`
- Create: `scripts/verify-outreach.ts`
- Modify: `package.json` (scripts block)
- Modify: `src/app/[slug]/page.tsx` (the `generateMetadata` select near line 280, and the robots line near line 311)
- Modify: `src/app/[slug]/[page]/page.tsx` (the robots line near line 192)

**Interfaces:**
- Consumes: nothing.
- Produces: `shouldNoindex(slug: string, status: string | null | undefined): boolean` and `NOINDEX_ROBOTS: { index: false; follow: true }` from `@/lib/noindex`. Nothing later in this plan imports them, but Phase 3 relies on the behavior: a business created by `/api/outreach/site` is `draft`, so its pitch page must not be crawlable.

**Why this matters:** `status` is selected on the public page but never gates rendering. A draft business is already publicly viewable and indexable at its slug today; only the sitemap filters on `live`. Once the outreach engine starts creating pitch sites for businesses that never signed up, those pages must not be crawlable under the real business's name. This fix also covers every draft that already exists.

- [ ] **Step 1: Write the failing checks**

Create `scripts/verify-outreach.ts`:

```ts
/**
 * Assertions for the outreach engine's pure logic.
 *
 * Run: npm run verify:outreach
 *
 * This repo has no test runner (see scripts/verify-stay-logic.ts for the same
 * reasoning). The functions checked here decide what Google indexes and what
 * text reaches a real business owner under Rami's name, so they get executable
 * checks rather than trust.
 */

import { shouldNoindex } from "../src/lib/noindex";

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`);
  }
}

console.log("\nshouldNoindex");
check("a live business is indexable", shouldNoindex("studio-avi", "live"), false);
check("a draft business is not", shouldNoindex("studio-avi", "draft"), true);
check("a missing status is not", shouldNoindex("studio-avi", null), true);
check("an unknown status is not", shouldNoindex("studio-avi", "archived"), true);
check("a live demo slug is still excluded", shouldNoindex("demo", "live"), true);
check("a live demo-prefixed slug is excluded", shouldNoindex("demo-barber", "live"), true);
check("a slug merely starting with the letters demo is fine", shouldNoindex("demolition-co", "live"), false);

console.log(failures === 0 ? "\nAll outreach checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
```

Add to the `scripts` block of `package.json`, after `"verify:stay"`:

```json
    "verify:outreach": "npx tsx scripts/verify-outreach.ts"
```

- [ ] **Step 2: Run the checks to verify they fail**

Run: `npm run verify:outreach`
Expected: FAIL — `Cannot find module '../src/lib/noindex'`.

- [ ] **Step 3: Write the predicate**

Create `src/lib/noindex.ts`:

```ts
import type { Metadata } from "next";

/**
 * Whether a public tenant page must be kept out of the search index.
 *
 * Two reasons, one rule:
 *  - Demo/template slugs are near-duplicate showcases.
 *  - A business that is not `live` has not signed up. Outreach pitch sites are
 *    created as drafts under the real business's name, and a crawlable pitch
 *    page for a business that never agreed to one is not acceptable. `status`
 *    was already selected on the public page but never gated anything; this is
 *    where it starts to.
 */
export function shouldNoindex(slug: string, status: string | null | undefined): boolean {
  if (/^demo(-|$)/.test(slug)) return true;
  return status !== "live";
}

/** follow:true so a noindexed page still passes link equity to bapita.com. */
export const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = { index: false, follow: true };
```

- [ ] **Step 4: Run the checks to verify they pass**

Run: `npm run verify:outreach`
Expected: PASS, all seven lines `ok`.

- [ ] **Step 5: Wire it into the business homepage metadata**

In `src/app/[slug]/page.tsx`, add the import next to the other `@/lib` imports:

```ts
import { shouldNoindex, NOINDEX_ROBOTS } from "@/lib/noindex";
```

Add `status` to the `generateMetadata` select (near line 280). This select is a *separate, shorter* select from the page's own select at line 104 — it is easy to miss. `status` is already in the anon column allowlist (line 104 selects it in production today), so **no new grant is required**:

```ts
    .select("name, name_he, tagline, hero_image_url, address, default_lang, business_type, status, custom_domain, custom_domain_verified")
```

Replace the robots line (near line 311):

```ts
    // Demo/template pages are near-duplicate showcases — keep them out of the
    // index. So is any business that is not live: draft pitch sites must not be
    // crawlable under a real business's name.
    ...(shouldNoindex(slug, data.status) && { robots: NOINDEX_ROBOTS }),
```

- [ ] **Step 6: Wire it into the extra-page metadata**

In `src/app/[slug]/[page]/page.tsx`, add the import:

```ts
import { shouldNoindex, NOINDEX_ROBOTS } from "@/lib/noindex";
```

`status` is already in `BUSINESS_COLUMNS` on this file, so only the robots line changes (near line 192):

```ts
    // Demo/template pages are near-duplicate showcases — keep them out of the
    // index. So is any business that is not live: draft pitch sites must not be
    // crawlable under a real business's name.
    ...(shouldNoindex(slug, b.status) && { robots: NOINDEX_ROBOTS }),
```

- [ ] **Step 7: Run the ship gate**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed with no new errors.

- [ ] **Step 8: Confirm the rendered tags by hand**

Run `npm run dev`, then:

```bash
curl -s http://localhost:3000/<a-live-slug>       | grep -i 'name="robots"'   # expect: no match
curl -s http://localhost:3000/<a-draft-slug>      | grep -i 'name="robots"'   # expect: noindex, follow
```

Pick the slugs from Supabase: `select slug, status from businesses order by status limit 10;`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/noindex.ts scripts/verify-outreach.ts package.json "src/app/[slug]/page.tsx" "src/app/[slug]/[page]/page.tsx"
git commit -m "fix(seo): noindex every business page that is not live

status was selected on the public page but never gated anything, so a draft
business was publicly viewable and indexable at its slug. Only the sitemap
filtered on live. Generalises the /^demo(-|$)/ special case into one predicate
and covers every existing draft, plus the outreach pitch sites to come."
```

---

## Task 2: `businesses.lead_source` column

**Files:**
- Create: `docs/migrations/2026-08-31-lead-source.sql`
- Modify: `src/types/index.ts` (the `Business` interface, near line 103)

**Interfaces:**
- Consumes: nothing.
- Produces: a nullable `lead_source` text column on `public.businesses`, and `lead_source?: string | null` on the `Business` type. Task 7 (`/api/outreach/site`) writes `"outreach"` into it; Task 3's `buildBusinessPayload` accepts an optional `leadSource`.

**Why this matters:** intake stamps every created business with the admin's own `owner_id`. Without a marker column, the admin board fills with pitch drafts that are indistinguishable from real clients.

- [ ] **Step 1: Write the migration**

Create `docs/migrations/2026-08-31-lead-source.sql`:

```sql
-- Outreach engine: mark businesses that exist only as an outbound pitch.
-- Plan: docs/superpowers/plans/2026-08-31-outreach-sheet-engine.md (Task 2)
-- Spec: docs/superpowers/specs/2026-08-31-outreach-sheet-engine-design.md
-- Project: ixihybsstplqavbpbrlo (prod)
--
-- WHAT: one nullable text column. 'outreach' means this business was created by
-- POST /api/outreach/site as a pitch site for a prospect who has not signed up.
-- NULL means everything else, which is every row that exists today.
--
-- WHY: the admin intake stamps every business it creates with the admin's own
-- owner_id, so a pitch draft and a real client look identical in the admin
-- board. Once a batch of 40 prospects runs, that board is unusable without a
-- marker. Filtering on status='draft' is not enough: real clients sit in draft
-- while their site is being built.
--
-- NO ANON GRANT, deliberately. `anon` reads public.businesses through a
-- COLUMN-LEVEL allowlist (see 2026-07-08-custom-domain-grants.sql), and a
-- column added without a grant breaks any public select that names it. This
-- column is never named by src/app/[slug]/page.tsx, src/app/[slug]/[page]/page.tsx
-- or any other anon-key query — it is admin-only and read through the
-- service-role client. Adding a grant here would leak sales pipeline state to
-- the public. Stated explicitly because of the 2026-08-22 incident
-- (2026-08-22-stay-anon-column-grants.sql), whose lesson is "grant when the
-- public select names it", not "grant every column".
--
-- No index. Cardinality is two values and the admin board reads the whole
-- table anyway; an index here would cost writes and buy nothing.

alter table public.businesses add column if not exists lead_source text;

comment on column public.businesses.lead_source is
  'Provenance marker. ''outreach'' = created by /api/outreach/site as an outbound pitch site, not a signed-up client. NULL = everything else. Never granted to anon.';

-- Verify (must return one row, is_nullable = YES):
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_schema='public' and table_name='businesses' and column_name='lead_source';
--
-- Verify anon CANNOT read it (must return zero rows):
--   select column_name from information_schema.column_privileges
--    where table_schema='public' and table_name='businesses'
--      and grantee='anon' and column_name='lead_source';
--
-- Rollback (safe at any time — nothing reads it until Task 7 ships):
--   alter table public.businesses drop column lead_source;
```

- [ ] **Step 2: Apply the migration**

Paste the file into the Supabase SQL editor for project `ixihybsstplqavbpbrlo` and run it. Then run both verify queries from the file's comments and confirm: the first returns exactly one row with `is_nullable = YES`, the second returns **zero** rows.

- [ ] **Step 3: Add the field to the `Business` type**

In `src/types/index.ts`, inside `export interface Business`, directly under the `status` line (near line 103):

```ts
  status: "draft" | "live";
  /**
   * Provenance. "outreach" = created by /api/outreach/site as an outbound pitch
   * site for a prospect who never signed up. Null for every real client.
   * Admin-only: never granted to anon, never selected by a public page.
   */
  lead_source?: string | null;
```

- [ ] **Step 4: Run the ship gate**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add docs/migrations/2026-08-31-lead-source.sql src/types/index.ts
git commit -m "feat(db): businesses.lead_source to mark outbound pitch drafts

Intake stamps every business it creates with the admin's own owner_id, so a
pitch site and a real client are indistinguishable in the admin board. Nullable
text, no anon grant (the column never enters a public select), no index."
```

---

## Task 3: Extract `src/lib/intake/`

**Files:**
- Create: `src/lib/intake/prompt.ts`
- Create: `src/lib/intake/llm.ts`
- Create: `src/lib/intake/payload.ts`
- Create: `src/lib/intake/insert.ts`
- Create: `src/lib/intake/index.ts`
- Modify: `src/app/api/admin/intake/route.ts` (all 229 lines collapse to a thin caller)

**Interfaces:**
- Consumes: `lead_source` from Task 2 (only as an optional payload field).
- Produces, all importable from `@/lib/intake`:
  - `SYSTEM_INSTRUCTION: string`
  - `GROQ_MODELS: string[]`, `OLLAMA_MODEL: string`
  - `buildIntakeUserMessage(input: { lang: string; vibe: string; raw: string }): string`
  - `hasLlmProvider(): boolean`
  - `callLLM(userMessage: string): Promise<string>`
  - `generateBusinessDraft(userMessage: string): Promise<Record<string, unknown>>` — throws `LlmJsonError` on unparseable output, any other error on provider failure
  - `class LlmJsonError extends Error { readonly detail: string }`
  - `BRAND_ACCENT: string`
  - `buildBusinessPayload(input: { slug: string; ownerId: string; lang: string; parsed: Record<string, unknown>; leadSource?: string }): Record<string, unknown>`
  - `insertBusinessWithServices(payload: Record<string, unknown>, services: unknown): Promise<{ id: string; error: null } | { id: null; error: string }>`

**Why this matters:** `/api/outreach/site` needs exactly this logic. The alternative is copy pasting 200 lines that will drift. **Behavior must be byte-identical** — this is a pure move, no improvements, no renames of the values that reach the database.

- [ ] **Step 1: Capture the pre-refactor baseline**

Before touching anything, generate one business through the existing admin UI at `/admin/businesses/auto` (or by curl against a running dev server with an admin cookie). Then dump the row:

```sql
select * from businesses where slug = '<the-slug-you-just-made>';
select * from services where business_id = '<that-id>' order by display_order;
```

Save both as JSON to `/private/tmp/claude-501/-Users-admin-Desktop-bapita-book/*/scratchpad/intake-before.json`. This is the diff target in Step 8. Do not skip it: an extraction that silently drops a column is invisible to `tsc`.

- [ ] **Step 2: Move the prompt**

Create `src/lib/intake/prompt.ts`. Copy `GROQ_MODELS`, `OLLAMA_MODEL` and `SYSTEM_INSTRUCTION` **verbatim** from `src/app/api/admin/intake/route.ts:9-53`, keeping the comment above `GROQ_MODELS`, and add the user-message builder that is currently inline at route lines 127-130:

```ts
// Groq retires model IDs without notice; a decommissioned ID returns 404
// model_not_found and used to surface as a generic "LLM error" in the admin UI.
// Keep this list ordered by preference and verify against
// GET https://api.groq.com/openai/v1/models before editing.
export const GROQ_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
export const OLLAMA_MODEL = "llama3.2:3b";

export const SYSTEM_INSTRUCTION = `<paste route.ts lines 20-53 verbatim, backticks and all>`;

/** The exact user message shape the admin intake has always sent. */
export function buildIntakeUserMessage(input: { lang: string; vibe: string; raw: string }): string {
  return `Language preference: ${input.lang === "he" ? "Hebrew primary" : "English primary"}
Vibe / notes: ${input.vibe || "(none)"}
Raw business info:
${input.raw}`;
}
```

- [ ] **Step 3: Move the LLM call**

Create `src/lib/intake/llm.ts`. `callLLM` is `route.ts:55-105` verbatim except the log prefix stays `[intake]`:

```ts
import OpenAI from "openai";
import { GROQ_MODELS, OLLAMA_MODEL, SYSTEM_INSTRUCTION } from "./prompt";

/** The LLM returned something that is not JSON. Carries the raw text for the caller's 422. */
export class LlmJsonError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super("LLM returned invalid JSON");
    this.name = "LlmJsonError";
    this.detail = detail;
  }
}

export function hasLlmProvider(): boolean {
  return Boolean(process.env.GROQ_API_KEY || process.env.OLLAMA_BASE_URL);
}

export async function callLLM(userMessage: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const ollamaUrl = process.env.OLLAMA_BASE_URL;

  if (groqKey) {
    const client = new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" });
    let lastErr: unknown = null;

    for (const model of GROQ_MODELS) {
      try {
        const res = await client.chat.completions.create({
          model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user",   content: userMessage },
          ],
          temperature: 0.3,
        });
        const text = res.choices[0]?.message?.content ?? "";
        if (text) return text;
        lastErr = new Error(`Groq model ${model} returned an empty completion`);
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number })?.status;
        const retryable = status === 404 || status === 400 || status === 429 || status === 503;
        if (!retryable) break;
        console.warn(`[intake] Groq model ${model} unusable (status ${status}) — trying next`);
      }
    }

    if (!ollamaUrl) throw lastErr ?? new Error("Groq call failed");
    console.warn("[intake] All Groq models failed — falling back to Ollama", String(lastErr));
  }

  if (ollamaUrl) {
    const client = new OpenAI({ apiKey: "ollama", baseURL: `${ollamaUrl}/v1` });
    const res = await client.chat.completions.create({
      model: OLLAMA_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user",   content: userMessage },
      ],
      temperature: 0.3,
    });
    return res.choices[0]?.message?.content ?? "";
  }

  throw new Error("No LLM provider configured (GROQ_API_KEY or OLLAMA_BASE_URL required)");
}

/** callLLM plus the JSON parse the admin route has always done inline. */
export async function generateBusinessDraft(userMessage: string): Promise<Record<string, unknown>> {
  const text = await callLLM(userMessage);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.error("[intake] JSON parse failed, raw:", text);
    throw new LlmJsonError(text.slice(0, 500));
  }
}
```

- [ ] **Step 4: Move the payload builder**

Create `src/lib/intake/payload.ts`. Every key and every `||` fallback is copied from `route.ts:148-207` unchanged. The only additions are the `leadSource` parameter and `ownerId`/`lang` becoming arguments instead of closure variables:

```ts
// Fixed brand accent applied to every auto-generated business (RGB 184,134,42).
// The LLM's per-vibe accent_color suggestion is intentionally ignored.
export const BRAND_ACCENT = "#B8862A";

const DEFAULT_HOURS = {
  sunday:    { open: true,  start: "09:00", end: "19:00" },
  monday:    { open: true,  start: "09:00", end: "19:00" },
  tuesday:   { open: true,  start: "09:00", end: "19:00" },
  wednesday: { open: true,  start: "09:00", end: "19:00" },
  thursday:  { open: true,  start: "09:00", end: "19:00" },
  friday:    { open: true,  start: "09:00", end: "16:00" },
  saturday:  { open: false, start: "10:00", end: "14:00" },
};

export interface BusinessPayloadInput {
  slug: string;
  ownerId: string;
  lang: string;
  parsed: Record<string, unknown>;
  /** "outreach" for pitch sites. Omitted entirely when absent, so the admin
   *  intake writes exactly the row it wrote before this extraction. */
  leadSource?: string;
}

export function buildBusinessPayload(input: BusinessPayloadInput): Record<string, unknown> {
  const { slug, ownerId, lang, parsed, leadSource } = input;

  // Merge per-day so a day the LLM omitted falls back to a default instead of
  // leaving a hole that breaks the public page.
  const parsedHours = (parsed.business_hours ?? {}) as Record<string, unknown>;
  const mergedHours = Object.fromEntries(
    Object.entries(DEFAULT_HOURS).map(([day, def]) => [day, parsedHours[day] ?? def])
  );

  return {
    slug,
    owner_id:           ownerId,
    status:             "draft",
    show_about:         true,
    show_gallery:       true,
    show_hours:         true,
    show_location:      true,
    show_stats:         true,
    show_open_status:   true,
    show_services:      true,
    show_reviews:       true,
    profile_image_url:  null,
    name:               parsed.name        || slug,
    name_he:            parsed.name_he     || "",
    tagline:            parsed.tagline     || "",
    tagline_he:         parsed.tagline_he  || "",
    about_text:         parsed.about_text  || "",
    about_text_he:      parsed.about_text_he || "",
    phone:              parsed.phone       || "",
    address:            parsed.address     || "",
    instagram_url:      parsed.instagram_url      || null,
    facebook_url:       parsed.facebook_url       || null,
    tiktok_url:         parsed.tiktok_url         || null,
    whatsapp_number:    parsed.whatsapp_number    || null,
    google_maps_url:    parsed.google_maps_url    || null,
    google_review_link: parsed.google_review_link || null,
    accent_color:       BRAND_ACCENT,
    template_style:     (parsed.template_style as string) || "classic",
    default_lang:       lang,
    dashboard_lang:     lang,
    google_reviews:     Array.isArray(parsed.google_reviews) ? parsed.google_reviews.map((r: Record<string,unknown>) => ({
      id:     crypto.randomUUID(),
      author: r.author,
      rating: r.rating,
      text:   r.text,
      date:   r.date,
    })) : null,
    business_hours: mergedHours,
    stat_years:   parsed.stat_years   || null,
    stat_clients: parsed.stat_clients || null,
    stat_rating:  parsed.stat_rating  || null,
    ...(leadSource ? { lead_source: leadSource } : {}),
  };
}
```

- [ ] **Step 5: Move the insert**

Create `src/lib/intake/insert.ts`, from `route.ts:165-226`:

```ts
import { createServiceClient } from "@/lib/supabase/service";

export async function insertBusinessWithServices(
  payload: Record<string, unknown>,
  services: unknown,
): Promise<{ id: string; error: null } | { id: null; error: string }> {
  const service = createServiceClient();

  const { data: biz, error: bizErr } = await service
    .from("businesses")
    .insert(payload)
    .select("id")
    .single();

  if (bizErr || !biz) return { id: null, error: bizErr?.message ?? "insert returned no row" };

  const list = Array.isArray(services) ? services : [];
  if (list.length > 0) {
    const rows = (list as Record<string, unknown>[]).map((s, i) => ({
      business_id:   biz.id,
      name:          s.name        || "",
      name_he:       s.name_he     || "",
      duration:      Number(s.duration) || 30,
      price:         Number(s.price)    || 0,
      description:   (s.description as string) || null,
      display_order: i,
      active:        true,
    }));
    await service.from("services").insert(rows);
  }

  return { id: biz.id as string, error: null };
}
```

Create `src/lib/intake/index.ts`:

```ts
export * from "./prompt";
export * from "./llm";
export * from "./payload";
export * from "./insert";
```

- [ ] **Step 6: Collapse the route to a thin caller**

Replace the whole of `src/app/api/admin/intake/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isReservedSlug } from "@/lib/reserved-slugs";
import {
  buildBusinessPayload,
  buildIntakeUserMessage,
  generateBusinessDraft,
  hasLlmProvider,
  insertBusinessWithServices,
  LlmJsonError,
} from "@/lib/intake";

const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];

export async function POST(req: Request) {
  if (!hasLlmProvider()) {
    return NextResponse.json({ error: "No LLM provider configured." }, { status: 500 });
  }

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = await req.json() as { slug?: string; lang?: string; raw?: string; vibe?: string };
  const { slug, lang = "he", raw = "", vibe = "" } = body;

  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  if (isReservedSlug(slug)) return NextResponse.json({ error: "slug is reserved" }, { status: 400 });
  if (!raw.trim()) return NextResponse.json({ error: "raw paste is required" }, { status: 400 });

  let parsed: Record<string, unknown>;
  try {
    parsed = await generateBusinessDraft(buildIntakeUserMessage({ lang, vibe, raw }));
  } catch (err) {
    if (err instanceof LlmJsonError) {
      return NextResponse.json({ error: err.message, detail: err.detail }, { status: 422 });
    }
    console.error("[intake] LLM error:", err);
    return NextResponse.json({ error: "LLM error", detail: String(err) }, { status: 422 });
  }

  const payload = buildBusinessPayload({ slug, ownerId: user.id, lang, parsed });
  const { id, error } = await insertBusinessWithServices(payload, parsed.services);
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ id });
}
```

Note the one deliberate response difference: the old code returned `{ error: "LLM returned invalid JSON", detail }` on a parse failure and the new code returns the same strings via `LlmJsonError`. Status codes, keys and values are unchanged.

- [ ] **Step 7: Run the ship gate**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 8: Diff a freshly generated business against the baseline**

Generate one more business through `/admin/businesses/auto` with **the same `raw`, `vibe`, `lang` and a new slug** as in Step 1. Dump the row and its services the same way, then compare:

```bash
# ignoring the keys that are expected to differ: id, slug, created_at, updated_at,
# the per-review uuids, and any LLM wording variance in name/tagline/about.
diff <(jq -S 'del(.id,.slug,.created_at,.updated_at)' intake-before.json) \
     <(jq -S 'del(.id,.slug,.created_at,.updated_at)' intake-after.json)
```

Expected: differences confined to LLM-authored prose and the review uuids. **Every structural key must be present in both**, with the same booleans, the same `accent_color` (`#B8862A`), the same seven `business_hours` days, and `lead_source` absent/null on both.

If a key is missing from the after-row, `buildBusinessPayload` dropped it. Fix and re-diff before committing.

- [ ] **Step 9: Commit**

```bash
git add src/lib/intake "src/app/api/admin/intake/route.ts"
git commit -m "refactor(intake): extract prompt, LLM chain, payload and insert into src/lib/intake

/api/outreach/site needs exactly this logic; the alternative is copy pasting
200 lines that will drift. Pure move, no behaviour change: the admin route is
now auth, validate, delegate. buildBusinessPayload takes an optional leadSource
that the admin route never passes, so the row it writes is unchanged."
```

- [ ] **Step 10: Push Phase 1**

```bash
git push
```

Then confirm a Vercel deployment for the pushed SHA actually exists — the GitHub webhook has silently failed before. If none appears within a couple of minutes:

```bash
npx vercel deploy --prod --yes --scope team_8ibtIeAI5bZIZWls7F97nUuD
```

**Phase 1 is shippable here.** Phases 2 to 4 are curl testable without any sheet.

---

## Task 4: Places enrichment fields

**Files:**
- Modify: `src/lib/google-places.ts` (append; leave `fetchPlaceData` and `fetchPlaceReviews` untouched)
- Modify: `scripts/verify-outreach.ts` (append checks for `extractPlaceIdFromUrl`)

**Interfaces:**
- Consumes: nothing.
- Produces, from `@/lib/google-places`:
  - `interface PlaceProfile { place_id: string; name: string; phone: string; address: string; website: string; rating: number | null; reviews_count: number | null; hours: string }`
  - `searchPlaceByQuery(query: string): Promise<string | null>` — Text Search, returns a `place_id`
  - `fetchPlaceProfile(placeId: string): Promise<PlaceProfile | null>` — Details
  - `extractPlaceIdFromUrl(query: string): string | null`
- Task 6 consumes all three.

- [ ] **Step 1: Write the failing checks**

Append to `scripts/verify-outreach.ts`, above the final `console.log`:

```ts
import { extractPlaceIdFromUrl } from "../src/lib/google-places";

console.log("\nextractPlaceIdFromUrl");
check(
  "a maps url carrying place_id",
  extractPlaceIdFromUrl("https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4"),
  "ChIJN1t_tDeuEmsRUsoyG83frY4",
);
check(
  "a query-string place_id",
  extractPlaceIdFromUrl("https://maps.google.com/?cid=1&place_id=ChIJrTLr-GyuEmsRBfy61i59si0"),
  "ChIJrTLr-GyuEmsRBfy61i59si0",
);
check("a plain business name is not a url", extractPlaceIdFromUrl("Studio Avi Tel Aviv"), null);
check("a maps url without a place_id", extractPlaceIdFromUrl("https://maps.app.goo.gl/abc123"), null);
```

Add the import to the top import block rather than mid-file.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run verify:outreach`
Expected: FAIL — `extractPlaceIdFromUrl` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/google-places.ts`:

```ts
/**
 * The outbound-prospecting view of a place: the fields a pitch needs, not the
 * fields the public page needs. Separate from PlaceData on purpose — that one
 * is cached for an hour and rendered publicly; this one is fetched once per
 * prospect and written into a sheet.
 */
export interface PlaceProfile {
  place_id: string;
  name: string;
  /** Digits and punctuation as Google returns it, e.g. "+972 54-123-4567". Empty when absent. */
  phone: string;
  address: string;
  /** The business's own website. Empty string when Google has none — that IS the signal. */
  website: string;
  rating: number | null;
  reviews_count: number | null;
  /** weekday_text joined with " | ". Empty when absent. */
  hours: string;
}

/**
 * A Maps URL sometimes carries the place_id outright. When it does, use it:
 * Text Search on a URL string returns garbage. Short links (maps.app.goo.gl)
 * do not carry one and are not followed; the caller falls back to asking for a
 * business name.
 */
export function extractPlaceIdFromUrl(query: string): string | null {
  if (!/^https?:\/\//i.test(query)) return null;
  const m = query.match(/place_id[=:]([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/** Text Search. Returns the top hit's place_id, or null. */
export async function searchPlaceByQuery(query: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !query.trim()) return null;

  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]?.place_id) return null;
    return data.results[0].place_id as string;
  } catch {
    return null;
  }
}

/** Place Details, prospecting field set. No caching: Places ToS limits how long
 *  most of these may be stored, and a prospect is enriched once. */
export async function fetchPlaceProfile(placeId: string): Promise<PlaceProfile | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeId) return null;

  const fields = [
    "place_id", "name", "international_phone_number", "formatted_address",
    "website", "rating", "user_ratings_total", "opening_hours/weekday_text",
  ].join(",");

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.result) return null;
    const r = data.result;

    return {
      place_id:      r.place_id ?? placeId,
      name:          r.name ?? "",
      phone:         r.international_phone_number ?? "",
      address:       r.formatted_address ?? "",
      website:       r.website ?? "",
      rating:        typeof r.rating === "number" ? r.rating : null,
      reviews_count: typeof r.user_ratings_total === "number" ? r.user_ratings_total : null,
      hours:         Array.isArray(r.opening_hours?.weekday_text)
                       ? r.opening_hours.weekday_text.join(" | ")
                       : "",
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run verify:outreach`
Expected: PASS.

- [ ] **Step 5: Ship gate and commit**

```bash
npx tsc --noEmit && npm run build
git add src/lib/google-places.ts scripts/verify-outreach.ts
git commit -m "feat(places): prospecting field set (phone, website, hours, rating, count)

fetchPlaceData stays as it is: it is cached for an hour and feeds public pages.
fetchPlaceProfile is uncached and fetched once per prospect, which is what the
Places ToS storage limits allow."
```

---

## Task 5: Outreach bearer auth and segment

**Files:**
- Create: `src/lib/outreach/auth.ts`
- Create: `src/lib/outreach/segment.ts`
- Modify: `src/middleware.ts` (the `needsAuth` function, near line 37)
- Modify: `scripts/verify-outreach.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `guardOutreach(req: Request): { ok: true } | { ok: false; response: NextResponse }` from `@/lib/outreach/auth`
  - `type Segment = "no_web" | "ig_only" | "has_site"` and `segmentFor(website: string | null | undefined): Segment` from `@/lib/outreach/segment`
- Tasks 6, 7 and 9 call `guardOutreach` as the first line of every handler. Tasks 6 and 9 use `Segment`.

**Trust boundary, restated from the spec:** Apps Script cannot carry a Supabase session cookie, so these endpoints get their own auth. Blast radius if `OUTREACH_SECRET` leaks: an attacker can create draft businesses and burn Groq quota. They cannot publish a site, read bookings, read customers, or touch a live tenant.

- [ ] **Step 1: Write the failing checks**

Append to `scripts/verify-outreach.ts` (import at the top of the file):

```ts
import { segmentFor } from "../src/lib/outreach/segment";

console.log("\nsegmentFor");
check("no website at all", segmentFor(""), "no_web");
check("null website", segmentFor(null), "no_web");
check("undefined website", segmentFor(undefined), "no_web");
check("instagram profile", segmentFor("https://www.instagram.com/studio.avi/"), "ig_only");
check("instagram without www", segmentFor("https://instagram.com/studio.avi"), "ig_only");
check("linktree", segmentFor("https://linktr.ee/studioavi"), "ig_only");
check("a real site", segmentFor("https://studio-avi.co.il"), "has_site");
check("a facebook page counts as a real site", segmentFor("https://facebook.com/studioavi"), "has_site");
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run verify:outreach`
Expected: FAIL — module `../src/lib/outreach/segment` not found.

- [ ] **Step 3: Implement the segment**

Create `src/lib/outreach/segment.ts`:

```ts
/**
 * Which pitch a prospect gets. Derived from the Places `website` field, which
 * is the single most predictive thing Google tells us about an Israeli
 * appointment business.
 */
export type Segment = "no_web" | "ig_only" | "has_site";

/**
 * no_web   — Google has no website field. Strongest pitch.
 * ig_only  — the "website" is an Instagram profile or a Linktree. Very common
 *            in this segment, and the pitch must never imply they have nothing:
 *            they clearly invested in Instagram.
 * has_site — a real site exists. The angle is bookings, not existence.
 */
export function segmentFor(website: string | null | undefined): Segment {
  const w = (website ?? "").trim().toLowerCase();
  if (!w) return "no_web";
  if (/(^|\/\/|\.)instagram\.com(\/|$)/.test(w) || /(^|\/\/|\.)linktr\.ee(\/|$)/.test(w)) {
    return "ig_only";
  }
  return "has_site";
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run verify:outreach`
Expected: PASS.

- [ ] **Step 5: Implement the bearer guard**

Create `src/lib/outreach/auth.ts`:

```ts
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * Auth for /api/outreach/*.
 *
 * These endpoints are called by Apps Script bound to a Google Sheet, which
 * cannot carry a Supabase session cookie. So they authenticate with a shared
 * bearer secret held in the sheet's Script Properties and checked here against
 * OUTREACH_SECRET.
 *
 * The blast radius is deliberately small: a leaked secret can create draft
 * businesses and burn LLM quota. It cannot publish a site, read bookings, read
 * customers, or touch a live tenant. Every handler behind this guard forces
 * status: "draft" and never accepts a status from the caller.
 */

// 30 calls per 60s per IP, module level (resets on cold start), same shape as
// api/public/track. Apps Script sleeps ~2s between rows, so a legitimate batch
// stays well under this; a scripted abuse loop does not.
const ipCounts = new Map<string, { count: number; resetAt: number }>();

function checkIpLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // timingSafeEqual throws on a length mismatch, which would itself leak length.
  // Compare fixed-width digests of the two instead.
  if (ab.length !== bb.length) {
    // Still burn a comparison so the failure path costs the same.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export function guardOutreach(req: Request): { ok: true } | { ok: false; response: NextResponse } {
  const secret = process.env.OUTREACH_SECRET;
  if (!secret) {
    console.error("[outreach] OUTREACH_SECRET is not set — refusing every request");
    return { ok: false, response: NextResponse.json({ error: "not configured" }, { status: 500 }) };
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!checkIpLimit(ip)) {
    return { ok: false, response: NextResponse.json({ error: "rate limited" }, { status: 429 }) };
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !constantTimeEqual(token, secret)) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  return { ok: true };
}
```

- [ ] **Step 6: Exempt `/api/outreach` from middleware session resolution**

`/api/outreach/*` does not start with `/api/admin`, so the admin email gate at `src/middleware.ts:408-419` never fires on it. But `needsAuth` currently returns `true` for every `/api/` path that is not `/api/public`, so each Apps Script call pays a Supabase session lookup for a cookie it will never send.

In `src/middleware.ts`, change the `/api/` line inside `needsAuth` (near line 37):

```ts
  // /api/outreach/* authenticates with its own bearer secret (see
  // src/lib/outreach/auth.ts), not a session cookie — Apps Script cannot carry
  // one. Resolving auth for it is pure waste. It is NOT under /api/admin, so
  // the admin email gate below never applied to it either.
  if (pathname.startsWith("/api/")) {
    return !pathname.startsWith("/api/public") && !pathname.startsWith("/api/outreach");
  }
```

Update the doc comment above `needsAuth` (near line 29) so the "fail-closed" note stays true:

```
 * Deliberately fail-closed: an `/api` route is only treated as public when it
 * is explicitly under `/api/public` or `/api/outreach` (the latter carries its
 * own bearer guard), so a new authenticated route added later is covered by
 * default rather than silently exposed.
```

- [ ] **Step 7: Add `OUTREACH_SECRET` to the environments**

Generate a secret and set it on Vercel for Production **and** Preview (both are needed; Preview env vars have bitten this project before), plus `.env.local` for local curl:

```bash
openssl rand -hex 32
```

Add `OUTREACH_SECRET=<value>` to `.env.local`. Set the Vercel values through the dashboard (the CLI write commands hang on this account).

- [ ] **Step 8: Ship gate and commit**

```bash
npx tsc --noEmit && npm run build
git add src/lib/outreach/ src/middleware.ts scripts/verify-outreach.ts
git commit -m "feat(outreach): bearer guard, rate limit and segment derivation

Apps Script cannot carry a Supabase session cookie, so /api/outreach/* gets its
own shared-secret auth with a constant time compare and a module-level IP limit.
A leaked secret can create drafts and burn LLM quota, nothing more."
```

---

## Task 6: `POST /api/outreach/enrich`

**Files:**
- Create: `src/app/api/outreach/enrich/route.ts`

**Interfaces:**
- Consumes: `guardOutreach` (Task 5), `segmentFor`/`Segment` (Task 5), `searchPlaceByQuery`/`fetchPlaceProfile`/`extractPlaceIdFromUrl` (Task 4).
- Produces: the HTTP contract the Apps Script `Enrich selected` action calls in Task 10:

```
POST /api/outreach/enrich
  Authorization: Bearer <OUTREACH_SECRET>
  { query: string, place_id?: string }
  → 200 { place_id, name, phone, address, website, rating, reviews_count, hours, segment }
  → 400 { error } | 401 { error } | 404 { error } | 429 { error } | 500 { error }
```

- [ ] **Step 1: Write the handler**

Create `src/app/api/outreach/enrich/route.ts`:

```ts
import { NextResponse } from "next/server";
import { guardOutreach } from "@/lib/outreach/auth";
import { segmentFor } from "@/lib/outreach/segment";
import {
  extractPlaceIdFromUrl,
  fetchPlaceProfile,
  searchPlaceByQuery,
} from "@/lib/google-places";

/**
 * Row-at-a-time enrichment for the outreach sheet. Free (Places only, no LLM),
 * so it runs on every prospect; the two paid endpoints are chosen per row.
 *
 * Returns real HTTP status codes: the Apps Script fetches with
 * muteHttpExceptions, writes a failure into last_error, sets status "error",
 * and moves to the next row. One bad row never kills a batch.
 */
export async function POST(req: Request) {
  const guard = guardOutreach(req);
  if (!guard.ok) return guard.response;

  let body: { query?: string; place_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  let placeId = (body.place_id ?? "").trim();

  if (!placeId && !query) {
    return NextResponse.json({ error: "query or place_id is required" }, { status: 400 });
  }

  if (!placeId) {
    // A pasted Maps URL sometimes carries the id outright; Text Search on a URL
    // string returns garbage, so try the id first.
    placeId = extractPlaceIdFromUrl(query) ?? "";
  }

  if (!placeId) {
    if (/^https?:\/\//i.test(query)) {
      return NextResponse.json(
        { error: "that Maps link carries no place_id, put the business name and city in query instead" },
        { status: 400 },
      );
    }
    placeId = (await searchPlaceByQuery(query)) ?? "";
  }

  if (!placeId) {
    return NextResponse.json({ error: `no Google Places match for "${query}"` }, { status: 404 });
  }

  const profile = await fetchPlaceProfile(placeId);
  if (!profile) {
    return NextResponse.json({ error: `Places details failed for ${placeId}` }, { status: 404 });
  }

  return NextResponse.json({ ...profile, segment: segmentFor(profile.website) });
}
```

- [ ] **Step 2: Run the ship gate**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 3: Verify by curl**

With `npm run dev` running and `OUTREACH_SECRET` in `.env.local`:

```bash
S=$(grep OUTREACH_SECRET .env.local | cut -d= -f2)

# happy path — a real Israeli business with no site
curl -s -X POST localhost:3000/api/outreach/enrich \
  -H "Authorization: Bearer $S" -H 'content-type: application/json' \
  -d '{"query":"מספרה תל אביב"}' | jq

# no auth
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/outreach/enrich \
  -H 'content-type: application/json' -d '{"query":"x"}'          # expect 401

# wrong secret
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/outreach/enrich \
  -H "Authorization: Bearer nope" -H 'content-type: application/json' -d '{"query":"x"}'  # expect 401

# no match
curl -s -X POST localhost:3000/api/outreach/enrich \
  -H "Authorization: Bearer $S" -H 'content-type: application/json' \
  -d '{"query":"zzzzqqqq nonexistent business 99999"}' | jq        # expect 404 with an error string
```

Expected on the happy path: a JSON object with all nine keys, `segment` one of `no_web`/`ig_only`/`has_site`, and `phone` in `+972 ...` form.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/outreach/enrich/route.ts"
git commit -m "feat(outreach): POST /api/outreach/enrich

Places-only, no LLM, so it runs on every prospect. Accepts a name+city query, a
Maps URL carrying a place_id, or a place_id directly."
```

---

## Task 7: `POST /api/outreach/site`

**Files:**
- Create: `src/lib/outreach/slug.ts`
- Create: `src/app/api/outreach/site/route.ts`
- Modify: `scripts/verify-outreach.ts`

**Interfaces:**
- Consumes: `guardOutreach` (Task 5); `buildBusinessPayload`, `buildIntakeUserMessage`, `generateBusinessDraft`, `hasLlmProvider`, `insertBusinessWithServices`, `LlmJsonError` (Task 3); `lead_source` column (Task 2); `isReservedSlug` from `@/lib/reserved-slugs` (existing).
- Produces:
  - `deriveSlug(name: string): string` and `pickFreeSlug(base: string): Promise<string>` from `@/lib/outreach/slug`
  - the HTTP contract:

```
POST /api/outreach/site
  Authorization: Bearer <OUTREACH_SECRET>
  { place_id: string, query?: string, notes?: string, lang?: "he"|"en", slug?: string, force?: boolean, business_id?: string }
  → 200 { business_id, slug, site_url }
  → 409 { error } when business_id is already set and force is not true
```

**Idempotency, from the spec:** without the 409, one accidental re-run creates 40 duplicate draft businesses and burns 40 slugs.

- [ ] **Step 1: Write the failing checks**

Append to `scripts/verify-outreach.ts` (import at the top):

```ts
import { deriveSlug } from "../src/lib/outreach/slug";

console.log("\nderiveSlug");
check("plain english", deriveSlug("Studio Avi"), "studio-avi");
check("punctuation dropped", deriveSlug("Avi's Barber Shop!"), "avis-barber-shop");
check("collapses runs of separators", deriveSlug("Studio   Avi -- Tel  Aviv"), "studio-avi-tel-aviv");
check("trims leading and trailing separators", deriveSlug("  -Studio Avi-  "), "studio-avi");
check("hebrew only falls back", deriveSlug("מספרת אבי"), "business");
check("mixed keeps the latin part", deriveSlug("מספרת Avi"), "avi");
check("empty falls back", deriveSlug(""), "business");
check("caps a very long name", deriveSlug("a".repeat(80)).length <= 40, true);
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run verify:outreach`
Expected: FAIL — module `../src/lib/outreach/slug` not found.

- [ ] **Step 3: Implement the slug helpers**

Create `src/lib/outreach/slug.ts`:

```ts
import { createServiceClient } from "@/lib/supabase/service";
import { isReservedSlug } from "@/lib/reserved-slugs";

/**
 * A URL slug from a business name.
 *
 * Places returns Hebrew names for most Israeli businesses and a Hebrew slug is
 * not usable in a pitch link, so non-latin characters are dropped rather than
 * transliterated. A name with no latin characters at all falls back to
 * "business" and picks up a numeric suffix from pickFreeSlug — ugly, but the
 * caller can always pass an explicit `slug`.
 */
export function deriveSlug(name: string): string {
  const s = (name || "")
    .toLowerCase()
    .replace(/['’]/g, "")        // Avi's -> avis, not avi-s
    .replace(/[^a-z0-9]+/g, "-") // everything else becomes a separator
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");        // the slice may have left a trailing separator

  return s || "business";
}

/**
 * The first free slug at or after `base`: base, base-2, base-3, ...
 * Reserved slugs are treated as taken.
 */
export async function pickFreeSlug(base: string): Promise<string> {
  const service = createServiceClient();

  for (let i = 1; i <= 50; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    if (isReservedSlug(candidate)) continue;

    const { data } = await service
      .from("businesses")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) return candidate;
  }

  throw new Error(`no free slug after 50 tries from "${base}"`);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run verify:outreach`
Expected: PASS.

- [ ] **Step 5: Write the handler**

Create `src/app/api/outreach/site/route.ts`:

```ts
import { NextResponse } from "next/server";
import { guardOutreach } from "@/lib/outreach/auth";
import { deriveSlug, pickFreeSlug } from "@/lib/outreach/slug";
import { isReservedSlug } from "@/lib/reserved-slugs";
import {
  buildBusinessPayload,
  buildIntakeUserMessage,
  generateBusinessDraft,
  hasLlmProvider,
  insertBusinessWithServices,
  LlmJsonError,
} from "@/lib/intake";
import { fetchPlaceProfile } from "@/lib/google-places";

const BOOKING_ORIGIN = "https://book.bapita.com";

/**
 * Creates ONE draft pitch site for a prospect.
 *
 * Forces status "draft" and lead_source "outreach". It never accepts a status
 * from the caller and can never publish — that is the whole reason a leaked
 * bearer secret is survivable.
 *
 * owner_id is the admin's, exactly as the admin intake does; lead_source is
 * what distinguishes a pitch draft from a real client in the admin board.
 */
export async function POST(req: Request) {
  const guard = guardOutreach(req);
  if (!guard.ok) return guard.response;

  if (!hasLlmProvider()) {
    return NextResponse.json({ error: "No LLM provider configured." }, { status: 500 });
  }

  const ownerId = process.env.OUTREACH_OWNER_ID;
  if (!ownerId) {
    return NextResponse.json({ error: "OUTREACH_OWNER_ID is not set" }, { status: 500 });
  }

  let body: {
    place_id?: string; query?: string; notes?: string;
    lang?: string; slug?: string; force?: boolean; business_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  // Idempotency. Without this, one accidental re-run of a 40 row batch creates
  // 40 duplicate drafts and burns 40 slugs.
  if (body.business_id && !body.force) {
    return NextResponse.json(
      { error: "row already has a business_id, pass force:true to build another" },
      { status: 409 },
    );
  }

  const placeId = (body.place_id ?? "").trim();
  if (!placeId) {
    return NextResponse.json({ error: "place_id is required, enrich the row first" }, { status: 400 });
  }

  const profile = await fetchPlaceProfile(placeId);
  if (!profile) {
    return NextResponse.json({ error: `Places details failed for ${placeId}` }, { status: 404 });
  }

  const lang = body.lang === "en" ? "en" : "he";

  // The same raw paste shape the admin intake feeds the LLM, assembled from
  // Places instead of a human copy paste.
  const raw = [
    `Name: ${profile.name}`,
    profile.address       ? `Address: ${profile.address}` : "",
    profile.phone         ? `Phone: ${profile.phone}` : "",
    profile.website       ? `Website: ${profile.website}` : "",
    profile.rating        ? `Google rating: ${profile.rating}` : "",
    profile.reviews_count ? `Google reviews: ${profile.reviews_count}` : "",
    profile.hours         ? `Hours: ${profile.hours}` : "",
    body.query            ? `Search query used: ${body.query}` : "",
  ].filter(Boolean).join("\n");

  let parsed: Record<string, unknown>;
  try {
    parsed = await generateBusinessDraft(
      buildIntakeUserMessage({ lang, vibe: body.notes ?? "", raw }),
    );
  } catch (err) {
    if (err instanceof LlmJsonError) {
      return NextResponse.json({ error: err.message, detail: err.detail }, { status: 422 });
    }
    console.error("[outreach/site] LLM error:", err);
    return NextResponse.json({ error: "LLM error", detail: String(err) }, { status: 422 });
  }

  const requested = (body.slug ?? "").trim();
  if (requested && isReservedSlug(requested)) {
    return NextResponse.json({ error: "slug is reserved" }, { status: 400 });
  }

  let slug: string;
  try {
    slug = requested
      ? await pickFreeSlug(deriveSlug(requested))
      : await pickFreeSlug(deriveSlug((parsed.name as string) || profile.name));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const payload = buildBusinessPayload({
    slug,
    ownerId,
    lang,
    parsed,
    leadSource: "outreach",
  });
  // Belt and braces: buildBusinessPayload already sets draft, and nothing in
  // `parsed` can reach `status`, but this endpoint must never publish.
  payload.status = "draft";
  payload.google_place_id = placeId;

  const { id, error } = await insertBusinessWithServices(payload, parsed.services);
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({
    business_id: id,
    slug,
    site_url: `${BOOKING_ORIGIN}/${slug}`,
  });
}
```

- [ ] **Step 6: Add `OUTREACH_OWNER_ID`**

The admin user's Supabase `auth.users.id`. Find it:

```sql
select id, email from auth.users where email = 'info.bapita@gmail.com';
```

Add `OUTREACH_OWNER_ID=<that uuid>` to `.env.local` and to Vercel Production and Preview.

- [ ] **Step 7: Run the ship gate**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 8: Verify by curl**

```bash
S=$(grep OUTREACH_SECRET .env.local | cut -d= -f2)
P=<a place_id from the Task 6 enrich response>

curl -s -X POST localhost:3000/api/outreach/site \
  -H "Authorization: Bearer $S" -H 'content-type: application/json' \
  -d "{\"place_id\":\"$P\",\"notes\":\"neighbourhood barber, warm\",\"lang\":\"he\"}" | jq

# idempotency
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/outreach/site \
  -H "Authorization: Bearer $S" -H 'content-type: application/json' \
  -d "{\"place_id\":\"$P\",\"business_id\":\"anything\"}"   # expect 409
```

Then confirm in Supabase that the created row has `status = 'draft'` and `lead_source = 'outreach'`, and load `http://localhost:3000/<slug>` and check the page carries `noindex` (Task 1):

```bash
curl -s http://localhost:3000/<slug> | grep -i 'name="robots"'   # expect: noindex, follow
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/outreach/slug.ts "src/app/api/outreach/site/route.ts" scripts/verify-outreach.ts
git commit -m "feat(outreach): POST /api/outreach/site

Builds one draft pitch site from a place_id through the extracted intake lib.
Forces status draft and lead_source outreach, refuses a row that already has a
business_id unless force, and never accepts a status from the caller."
```

---

## Task 8: Message composition library

**Files:**
- Create: `src/lib/outreach/message.ts`
- Modify: `scripts/verify-outreach.ts`

**Interfaces:**
- Consumes: `Segment` (Task 5).
- Produces, from `@/lib/outreach/message`:
  - `stripDashes(text: string): string`
  - `normalizePhone(raw: string): string` — returns `972…` digits, or `""`
  - `waLink(phone972: string, message: string): string`
  - `capOpener(text: string): string`
  - `buildOpenerPrompt(input: OpenerInput): { system: string; user: string }`
  - `composeMessage(input: { opener: string; segment: Segment; siteUrl: string }): string`
  - `type Channel = "whatsapp" | "instagram"`
  - `routeChannel(phone972: string, instagram: string): Channel | null`
- Task 9 calls all of them.

**Copy rule, non negotiable:** no dashes or hyphens in customer facing copy, Hebrew or English. `stripDashes` runs on the **opener only** — the composed message contains the site URL, whose slug legitimately contains hyphens, and stripping those would break the link.

- [ ] **Step 1: Write the failing checks**

Append to `scripts/verify-outreach.ts` (imports at the top):

```ts
import {
  capOpener, composeMessage, normalizePhone, routeChannel, stripDashes, waLink,
} from "../src/lib/outreach/message";

console.log("\nstripDashes");
check("ascii hyphen", stripDashes("ראיתי אתכם בגוגל - מרשים"), "ראיתי אתכם בגוגל מרשים");
check("en dash", stripDashes("4.9 – 127 ביקורות"), "4.9 127 ביקורות");
check("em dash", stripDashes("great — really"), "great really");
check("minus sign", stripDashes("a − b"), "a b");
check("non breaking hyphen", stripDashes("a‑b"), "a b");
check("collapses the double space a strip leaves", stripDashes("a - b"), "a b");
check("nothing to strip is untouched", stripDashes("ראיתי אתכם בגוגל"), "ראיתי אתכם בגוגל");

console.log("\nnormalizePhone");
check("international with spaces and dashes", normalizePhone("+972 54-123-4567"), "972541234567");
check("local leading zero", normalizePhone("054-123-4567"), "972541234567");
check("already normalized", normalizePhone("972541234567"), "972541234567");
check("parenthesised", normalizePhone("(054) 123 4567"), "972541234567");
check("empty", normalizePhone(""), "");
check("junk", normalizePhone("no phone"), "");

console.log("\nwaLink");
check(
  "encodes the message",
  waLink("972541234567", "היי, יום טוב."),
  "https://wa.me/972541234567?text=" + encodeURIComponent("היי, יום טוב."),
);

console.log("\ncapOpener");
check("short openers pass through", capOpener("ראיתי את הסטודיו בגוגל."), "ראיתי את הסטודיו בגוגל.");
check("a long opener is capped", capOpener("א".repeat(300)).length <= 180, true);

console.log("\nrouteChannel");
check("phone wins", routeChannel("972541234567", "studio.avi"), "whatsapp");
check("handle when no phone", routeChannel("", "studio.avi"), "instagram");
check("neither", routeChannel("", ""), null);

console.log("\ncomposeMessage");
const composed = composeMessage({
  opener: "ראיתי את הסטודיו בגוגל, 4.9 עם 127 ביקורות ועדיין בלי אתר.",
  segment: "no_web",
  siteUrl: "https://book.bapita.com/studio-avi",
});
check("opens with the fixed greeting", composed.startsWith("היי, יום טוב."), true);
check("carries the site url intact", composed.includes("https://book.bapita.com/studio-avi"), true);
check("ends with the signature", composed.trim().endsWith("רמי, Bapita"), true);
check("carries the soft CTA", composed.includes("אם זה מעניין אתכם, אשמח לדבר ולספר עוד."), true);
check(
  "no dash survives outside the url",
  /[-–—‑‒−]/.test(composed.replace("https://book.bapita.com/studio-avi", "")),
  false,
);
check(
  "the ig_only pitch never implies they have nothing",
  composeMessage({ opener: "x", segment: "ig_only", siteUrl: "https://book.bapita.com/x" })
    .includes("אינסטגרם"),
  true,
);
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run verify:outreach`
Expected: FAIL — module `../src/lib/outreach/message` not found.

- [ ] **Step 3: Implement**

Create `src/lib/outreach/message.ts`:

```ts
import type { Segment } from "./segment";

export type Channel = "whatsapp" | "instagram";

/** Hard cap on the LLM-authored opener. Beyond this it stops reading as a
 *  personal note and starts reading as a pitch deck. */
const OPENER_MAX = 180;

const GREETING  = "היי, יום טוב.";
const SOFT_CTA  = "אם זה מעניין אתכם, אשמח לדבר ולספר עוד.";
const SIGNATURE = "רמי, Bapita";

/**
 * The fixed value line per segment. The segment changes the PITCH, not only the
 * wording:
 *  - no_web   you have no presence, here is one, free to look at.
 *  - ig_only  your Instagram is the storefront, this is the booking layer under
 *             it. Never imply they have nothing; they clearly invested there.
 *  - has_site their site exists, so the angle is bookings, not existence.
 */
const VALUE: Record<Segment, { intro: string; payoff: string }> = {
  no_web: {
    intro:  "בניתי לכם אתר תורים מוכן, אפשר לראות כאן:",
    payoff: "לקוחות קובעים תור לבד, בלי הודעות וטלפונים בשעות העבודה.",
  },
  ig_only: {
    intro:  "האינסטגרם שלכם עושה את העבודה, חסרה שם רק דרך לקבוע תור. בניתי לכם אתר תורים מוכן, אפשר לראות כאן:",
    payoff: "הלקוחות ממשיכים להגיע מהאינסטגרם, רק קובעים תור לבד.",
  },
  has_site: {
    intro:  "בניתי לכם גרסה עם קביעת תורים מובנית, אפשר לראות כאן:",
    payoff: "לקוחות קובעים תור לבד, בלי הודעות וטלפונים בשעות העבודה.",
  },
};

/**
 * Standing copy rule: no dashes or hyphens in customer facing copy, Hebrew and
 * English alike. Enforced twice, in the prompt and here, because the prompt
 * alone will not hold.
 *
 * Applied to the OPENER ONLY. The composed message carries the site URL, whose
 * slug legitimately contains hyphens; stripping those breaks the link.
 */
export function stripDashes(text: string): string {
  return text
    .replace(/[-–—‑‒−]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Truncate at a word boundary rather than mid-word. */
export function capOpener(text: string): string {
  const t = text.trim();
  if (t.length <= OPENER_MAX) return t;
  const cut = t.slice(0, OPENER_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim();
}

/**
 * Places returns international_phone_number like "+972 54-123-4567".
 * wa.me needs digits only, country code included: "972541234567".
 * A local "054…" form drops the leading zero and gains a 972 prefix.
 */
export function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0"))   return `972${digits.slice(1)}`;
  if (digits.length === 9)      return `972${digits}`;
  return "";
}

/** Prefill works on mobile and on WhatsApp Web: one click, message already typed. */
export function waLink(phone972: string, message: string): string {
  return `https://wa.me/${phone972}?text=${encodeURIComponent(message)}`;
}

/** Phone wins, then Instagram. Neither means the row is `needs_channel`. */
export function routeChannel(phone972: string, instagram: string): Channel | null {
  if (phone972) return "whatsapp";
  if ((instagram || "").trim()) return "instagram";
  return null;
}

export interface OpenerInput {
  name: string;
  segment: Segment;
  rating: number | null;
  reviewsCount: number | null;
  notes: string;
  lang: "he" | "en";
}

/**
 * The opener is the ONLY generated part of the message, and it reaches a real
 * business owner under Rami's name. The prompt is therefore mostly a list of
 * things the model may not do.
 */
export function buildOpenerPrompt(input: OpenerInput): { system: string; user: string } {
  const system = `You write the opening line of a short outbound message from Rami, who builds booking websites for small Israeli businesses. You write ONE or TWO sentences and nothing else.

Hard rules:
- Write in ${input.lang === "he" ? "Hebrew" : "English"}. No other language.
- Reference EXACTLY ONE real fact from the data you are given.
- You may use ONLY the fields given below. Never invent services, prices, an owner's name, staff, years in business, or any claim about the business.
- NEVER use a dash or a hyphen of any kind. Not "-", not "–", not "—". Use a comma or a full stop.
- Maximum ${OPENER_MAX} characters. Shorter is better.
- No greeting, no sign off, no link, no call to action. Those are added around you.
- Warm and plain. Not salesy, no exclamation marks, no emoji.
- Output ONLY a JSON object: {"opener": string}`;

  const facts = [
    `name: ${input.name}`,
    input.rating       !== null ? `google rating: ${input.rating}` : "",
    input.reviewsCount !== null ? `google reviews: ${input.reviewsCount}` : "",
    `segment: ${input.segment}${input.segment === "no_web" ? " (no website at all)" : input.segment === "ig_only" ? " (instagram is their only web presence, never imply they have nothing)" : " (they already have a website, do not say they lack one)"}`,
    input.notes ? `note: ${input.notes}` : "",
  ].filter(Boolean).join("\n");

  return { system, user: facts };
}

/**
 * The six parts. The LLM writes exactly one of them (the opener); everything
 * else is fixed, which is what keeps a batch of forty messages safe to send.
 */
export function composeMessage(input: { opener: string; segment: Segment; siteUrl: string }): string {
  const v = VALUE[input.segment];
  return [
    GREETING,
    capOpener(stripDashes(input.opener)),
    v.intro,
    input.siteUrl,
    v.payoff,
    SOFT_CTA,
    SIGNATURE,
  ].join("\n");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run verify:outreach`
Expected: PASS, every check `ok`.

- [ ] **Step 5: Ship gate and commit**

```bash
npx tsc --noEmit && npm run build
git add src/lib/outreach/message.ts scripts/verify-outreach.ts
git commit -m "feat(outreach): message composition, six parts, one generated

Only the opener comes from the LLM. Greeting, per-segment value line, link,
soft CTA and signature are fixed, which is what makes a batch of forty safe to
send. The no-dashes rule is enforced in the prompt and again by a strip that
runs on the opener only, so the site URL's hyphens survive."
```

---

## Task 9: `POST /api/outreach/message`

**Files:**
- Create: `src/app/api/outreach/message/route.ts`

**Interfaces:**
- Consumes: `guardOutreach` (Task 5), everything from `@/lib/outreach/message` (Task 8), `callLLM` is NOT reused — this route needs its own system prompt, so it calls the `openai` SDK through a small local helper described below.
- Produces:

```
POST /api/outreach/message
  Authorization: Bearer <OUTREACH_SECRET>
  { place_id, name, segment, channel?, site_url, rating?, reviews_count?,
    notes?, lang?, phone?, instagram? }
  → 200 { message, action_link, channel }
  → 422 { error } when no channel can be routed
```

`message` is in the row's `lang` (Hebrew by default) and is what the script writes into `message_he`. There is no English field in the response; `message_en` is a `=GOOGLETRANSLATE` formula the script writes and never reads.

- [ ] **Step 1: Add an opener-specific LLM call to the intake lib**

`callLLM` hardcodes `SYSTEM_INSTRUCTION`. The opener needs a different system prompt on the same Groq chain with the same Ollama fallback, so generalize rather than fork. In `src/lib/intake/llm.ts`, change `callLLM` to take the system prompt as an optional second argument, defaulting to the existing constant so no existing caller changes:

```ts
export async function callLLM(
  userMessage: string,
  systemPrompt: string = SYSTEM_INSTRUCTION,
): Promise<string> {
```

and replace both `content: SYSTEM_INSTRUCTION` occurrences inside it with `content: systemPrompt`.

Run `npx tsc --noEmit` and `npm run verify:outreach` to confirm nothing broke.

- [ ] **Step 2: Write the handler**

Create `src/app/api/outreach/message/route.ts`:

```ts
import { NextResponse } from "next/server";
import { guardOutreach } from "@/lib/outreach/auth";
import { callLLM, hasLlmProvider } from "@/lib/intake";
import type { Segment } from "@/lib/outreach/segment";
import {
  buildOpenerPrompt, composeMessage, normalizePhone, routeChannel, waLink,
  type Channel,
} from "@/lib/outreach/message";

const SEGMENTS = new Set<Segment>(["no_web", "ig_only", "has_site"]);

/**
 * Writes one prospect's message. The LLM authors the opener and nothing else;
 * every other line is a fixed template chosen by segment.
 */
export async function POST(req: Request) {
  const guard = guardOutreach(req);
  if (!guard.ok) return guard.response;

  if (!hasLlmProvider()) {
    return NextResponse.json({ error: "No LLM provider configured." }, { status: 500 });
  }

  let body: {
    name?: string; segment?: string; channel?: string; site_url?: string;
    rating?: number | string; reviews_count?: number | string;
    notes?: string; lang?: string; phone?: string; instagram?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const siteUrl = (body.site_url ?? "").trim();
  if (!name)    return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!siteUrl) return NextResponse.json({ error: "site_url is required, build the site first" }, { status: 400 });

  const segment = SEGMENTS.has(body.segment as Segment) ? (body.segment as Segment) : "no_web";
  const lang: "he" | "en" = body.lang === "en" ? "en" : "he";

  const phone972 = normalizePhone(body.phone ?? "");
  const handle = (body.instagram ?? "").trim().replace(/^@/, "");

  // A value typed into the channel cell overrides the routing.
  const forced = body.channel === "whatsapp" || body.channel === "instagram"
    ? (body.channel as Channel)
    : null;
  const channel = forced ?? routeChannel(phone972, handle);

  if (!channel) {
    return NextResponse.json(
      { error: "no phone and no instagram handle, set one or mark the row needs_channel" },
      { status: 422 },
    );
  }
  if (channel === "whatsapp" && !phone972) {
    return NextResponse.json({ error: "channel is whatsapp but the phone did not normalise" }, { status: 422 });
  }
  if (channel === "instagram" && !handle) {
    return NextResponse.json({ error: "channel is instagram but no handle was given" }, { status: 422 });
  }

  const toNum = (v: unknown): number | null => {
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : null;
  };

  const { system, user } = buildOpenerPrompt({
    name,
    segment,
    rating: toNum(body.rating),
    reviewsCount: toNum(body.reviews_count),
    notes: (body.notes ?? "").trim(),
    lang,
  });

  let opener: string;
  try {
    const text = await callLLM(user, system);
    const parsed = JSON.parse(text) as { opener?: unknown };
    opener = typeof parsed.opener === "string" ? parsed.opener : "";
  } catch (err) {
    console.error("[outreach/message] LLM error:", err);
    return NextResponse.json({ error: "LLM error", detail: String(err) }, { status: 422 });
  }

  if (!opener.trim()) {
    return NextResponse.json({ error: "LLM returned an empty opener" }, { status: 422 });
  }

  const message = composeMessage({ opener, segment, siteUrl });

  const action_link = channel === "whatsapp"
    ? waLink(phone972, message)
    : `https://instagram.com/${handle}`;

  return NextResponse.json({ message, action_link, channel });
}
```

- [ ] **Step 3: Run the ship gate**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 4: Verify by curl**

```bash
S=$(grep OUTREACH_SECRET .env.local | cut -d= -f2)

curl -s -X POST localhost:3000/api/outreach/message \
  -H "Authorization: Bearer $S" -H 'content-type: application/json' \
  -d '{"name":"ספרות אבי","segment":"no_web","site_url":"https://book.bapita.com/studio-avi",
       "rating":4.9,"reviews_count":127,"phone":"+972 54-123-4567","lang":"he"}' | jq -r .message

# instagram routing
curl -s -X POST localhost:3000/api/outreach/message \
  -H "Authorization: Bearer $S" -H 'content-type: application/json' \
  -d '{"name":"Studio Avi","segment":"ig_only","site_url":"https://book.bapita.com/studio-avi",
       "instagram":"studio.avi","lang":"he"}' | jq

# needs_channel
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/outreach/message \
  -H "Authorization: Bearer $S" -H 'content-type: application/json' \
  -d '{"name":"x","segment":"no_web","site_url":"https://book.bapita.com/x"}'   # expect 422
```

Read the returned message end to end and confirm by eye:
- seven lines, greeting first, `רמי, Bapita` last;
- the opener states exactly one real fact and invents nothing;
- **no dash or hyphen anywhere outside the URL**;
- the `ig_only` variant never implies they have no presence;
- the `action_link` for whatsapp opens WhatsApp with the message prefilled.

- [ ] **Step 5: Commit and push Phases 2 to 4**

```bash
git add src/lib/intake/llm.ts "src/app/api/outreach/message/route.ts"
git commit -m "feat(outreach): POST /api/outreach/message

callLLM takes an optional system prompt so the opener reuses the Groq chain and
Ollama fallback instead of forking it. Channel routes phone first, then handle,
and a typed channel value overrides both."
git push
```

Confirm a Vercel deployment for the pushed SHA exists; if not, `npx vercel deploy --prod --yes --scope team_8ibtIeAI5bZIZWls7F97nUuD`.

Then repeat the three curl checks against `https://book.bapita.com` with the production `OUTREACH_SECRET`, to confirm the Vercel env vars are scoped correctly.

---

## Task 10: The sheet

**Files:**
- Create: `scripts/sheets/Code.gs`
- Create: `scripts/sheets/README.md`

**Interfaces:**
- Consumes: the three HTTP contracts from Tasks 6, 7 and 9.
- Produces: nothing importable — this file is pasted into Apps Script, not bundled. It is committed so it is versioned and reviewable.

**Sheet layout** (one tab, `Prospects`, headers in row 1). The script reads headers into a name to index map, so columns can be reordered later without editing code.

| Col | Name | Written by |
|---|---|---|
| A | `pick` | you (checkbox) |
| B | `query` | you |
| C | `notes` | you |
| D | `lang` | you (`he` default) |
| E | `instagram` | you (manual, see the spec's known gaps) |
| F–O | `place_id`, `name`, `phone`, `address`, `website`, `rating`, `reviews_count`, `hours`, `segment`, `enriched_at` | Enrich |
| P–S | `slug`, `site_url`, `business_id`, `site_at` | Create sites |
| T–X | `channel`, `message_he`, `message_en`, `action_link`, `message_at` | Write openers |
| Y–Z | `status`, `last_error` | all three |

Status ladder: `new` → `enriched` → `site` → `ready` → `sent` → `replied` → `won` | `lost`, plus `error` and `needs_channel`. The script advances up to `ready`; you set the rest by hand from the dropdown.

- [ ] **Step 1: Write the Apps Script**

Create `scripts/sheets/Code.gs`:

```javascript
/**
 * Bapita outreach sheet.
 *
 * Committed to the book repo so it is versioned and reviewable; it runs inside
 * Google, bound to the Prospects sheet. See scripts/sheets/README.md to install.
 *
 * The sheet is the brain: it holds per-row state, so a partial batch is
 * resumable and one bad row never kills the run.
 */

var BASE = 'https://book.bapita.com';
var HEADERS = [
  'pick', 'query', 'notes', 'lang', 'instagram',
  'place_id', 'name', 'phone', 'address', 'website', 'rating', 'reviews_count', 'hours', 'segment', 'enriched_at',
  'slug', 'site_url', 'business_id', 'site_at',
  'channel', 'message_he', 'message_en', 'action_link', 'message_at',
  'status', 'last_error'
];
var STATUSES = ['new', 'enriched', 'site', 'ready', 'sent', 'replied', 'won', 'lost', 'error', 'needs_channel'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Bapita')
    .addItem('Set up sheet', 'setUpSheet')
    .addSeparator()
    .addItem('Enrich selected', 'enrichSelected')
    .addItem('Create sites for selected', 'siteSelected')
    .addItem('Write openers for selected', 'messageSelected')
    .addToUi();
}

function secret_() {
  var s = PropertiesService.getScriptProperties().getProperty('BAPITA_OUTREACH_SECRET');
  if (!s) throw new Error('Set the BAPITA_OUTREACH_SECRET script property first (see README).');
  return s;
}

function sheet_() {
  var sh = SpreadsheetApp.getActive().getSheetByName('Prospects');
  if (!sh) throw new Error('No tab named Prospects.');
  return sh;
}

/** Header name to 1-based column index, so columns can be reordered freely. */
function headerMap_(sh) {
  var row = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < row.length; i++) {
    var key = String(row[i]).trim();
    if (key) map[key] = i + 1;
  }
  return map;
}

function setUpSheet() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName('Prospects') || ss.insertSheet('Prospects');

  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sh.setFrozenRows(1);

  var lastRow = Math.max(sh.getMaxRows(), 200);
  sh.getRange(2, 1, lastRow - 1, 1).insertCheckboxes();

  var statusCol = HEADERS.indexOf('status') + 1;
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
  sh.getRange(2, statusCol, lastRow - 1, 1).setDataValidation(rule);

  SpreadsheetApp.getUi().alert('Sheet ready. Tick pick on the rows you want, then use the Bapita menu.');
}

/** 1-based row numbers whose pick checkbox is ticked. */
function pickedRows_(sh, h) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  var picks = sh.getRange(2, h.pick, last - 1, 1).getValues();
  var rows = [];
  for (var i = 0; i < picks.length; i++) if (picks[i][0] === true) rows.push(i + 2);
  return rows;
}

function post_(path, payload) {
  var res = UrlFetchApp.fetch(BASE + path, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + secret_() },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  var body;
  try { body = JSON.parse(text); } catch (e) { body = { error: text.slice(0, 300) }; }
  return { code: code, body: body };
}

function set_(sh, row, h, name, value) {
  if (h[name]) sh.getRange(row, h[name]).setValue(value);
}

function fail_(sh, row, h, message) {
  set_(sh, row, h, 'status', 'error');
  set_(sh, row, h, 'last_error', String(message).slice(0, 500));
}

function now_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

/**
 * Every action shares this loop. ~2s between rows keeps a batch under Groq's
 * roughly 30 requests per minute, and the run stops cleanly before the Apps
 * Script 6 minute execution limit — completed rows are skipped on the next run,
 * so a stopped batch is resumed by picking the menu item again.
 */
function runBatch_(handler) {
  var sh = sheet_();
  var h = headerMap_(sh);
  var rows = pickedRows_(sh, h);
  if (!rows.length) {
    SpreadsheetApp.getUi().alert('No rows ticked in the pick column.');
    return;
  }

  var started = Date.now();
  var done = 0;
  var stoppedEarly = false;

  for (var i = 0; i < rows.length; i++) {
    if (Date.now() - started > 5 * 60 * 1000) { stoppedEarly = true; break; }
    try {
      handler(sh, rows[i], h);
    } catch (e) {
      fail_(sh, rows[i], h, e.message || e);
    }
    done++;
    SpreadsheetApp.flush();
    Utilities.sleep(2000);
  }

  SpreadsheetApp.getUi().alert(
    done + ' of ' + rows.length + ' row(s) processed.' +
    (stoppedEarly ? ' Stopped before the 6 minute limit, run it again to continue.' : '')
  );
}

function enrichSelected() {
  runBatch_(function (sh, row, h) {
    var query = String(sh.getRange(row, h.query).getValue()).trim();
    var placeId = h.place_id ? String(sh.getRange(row, h.place_id).getValue()).trim() : '';
    if (!query && !placeId) { fail_(sh, row, h, 'query is empty'); return; }

    var r = post_('/api/outreach/enrich', { query: query, place_id: placeId });
    if (r.code !== 200) { fail_(sh, row, h, r.code + ' ' + (r.body.error || '')); return; }

    var b = r.body;
    set_(sh, row, h, 'place_id', b.place_id);
    set_(sh, row, h, 'name', b.name);
    set_(sh, row, h, 'phone', b.phone);
    set_(sh, row, h, 'address', b.address);
    set_(sh, row, h, 'website', b.website);
    set_(sh, row, h, 'rating', b.rating);
    set_(sh, row, h, 'reviews_count', b.reviews_count);
    set_(sh, row, h, 'hours', b.hours);
    set_(sh, row, h, 'segment', b.segment);
    set_(sh, row, h, 'enriched_at', now_());
    set_(sh, row, h, 'status', 'enriched');
    set_(sh, row, h, 'last_error', '');
  });
}

function siteSelected() {
  runBatch_(function (sh, row, h) {
    var placeId = String(sh.getRange(row, h.place_id).getValue()).trim();
    if (!placeId) { fail_(sh, row, h, 'not enriched yet, no place_id'); return; }

    var existing = String(sh.getRange(row, h.business_id).getValue()).trim();
    if (existing) { return; }   // already built; skipping is what makes a batch resumable

    var r = post_('/api/outreach/site', {
      place_id: placeId,
      query: String(sh.getRange(row, h.query).getValue()).trim(),
      notes: String(sh.getRange(row, h.notes).getValue()).trim(),
      lang: String(sh.getRange(row, h.lang).getValue()).trim() || 'he'
    });
    if (r.code !== 200) { fail_(sh, row, h, r.code + ' ' + (r.body.error || '')); return; }

    set_(sh, row, h, 'slug', r.body.slug);
    set_(sh, row, h, 'site_url', r.body.site_url);
    set_(sh, row, h, 'business_id', r.body.business_id);
    set_(sh, row, h, 'site_at', now_());
    set_(sh, row, h, 'status', 'site');
    set_(sh, row, h, 'last_error', '');
  });
}

function messageSelected() {
  runBatch_(function (sh, row, h) {
    var siteUrl = String(sh.getRange(row, h.site_url).getValue()).trim();
    if (!siteUrl) { fail_(sh, row, h, 'no site_url yet, build the site first'); return; }

    var phone = String(sh.getRange(row, h.phone).getValue()).trim();
    var handle = String(sh.getRange(row, h.instagram).getValue()).trim();
    if (!phone && !handle) {
      set_(sh, row, h, 'status', 'needs_channel');
      set_(sh, row, h, 'last_error', 'no phone and no instagram handle');
      return;
    }

    var r = post_('/api/outreach/message', {
      name: String(sh.getRange(row, h.name).getValue()).trim(),
      segment: String(sh.getRange(row, h.segment).getValue()).trim(),
      channel: String(sh.getRange(row, h.channel).getValue()).trim(),
      site_url: siteUrl,
      rating: sh.getRange(row, h.rating).getValue(),
      reviews_count: sh.getRange(row, h.reviews_count).getValue(),
      notes: String(sh.getRange(row, h.notes).getValue()).trim(),
      lang: String(sh.getRange(row, h.lang).getValue()).trim() || 'he',
      phone: phone,
      instagram: handle
    });
    if (r.code !== 200) { fail_(sh, row, h, r.code + ' ' + (r.body.error || '')); return; }

    set_(sh, row, h, 'channel', r.body.channel);
    set_(sh, row, h, 'message_he', r.body.message);
    set_(sh, row, h, 'action_link', r.body.action_link);
    set_(sh, row, h, 'message_at', now_());
    set_(sh, row, h, 'status', 'ready');
    set_(sh, row, h, 'last_error', '');

    // Reading aid only. Written per row because GOOGLETRANSLATE vectorises
    // badly under ARRAYFORMULA. The script NEVER reads this column, which is
    // what makes the transient "Loading..." value harmless: it can never reach
    // a sent message. Machine translation is not send quality.
    if (h.message_en && h.message_he) {
      var heA1 = sh.getRange(row, h.message_he).getA1Notation();
      sh.getRange(row, h.message_en).setFormula('=GOOGLETRANSLATE(' + heA1 + ',"he","en")');
    }
  });
}
```

- [ ] **Step 2: Write the setup README**

Create `scripts/sheets/README.md`:

```markdown
# Outreach sheet setup

`Code.gs` runs inside Google Apps Script, bound to the prospects spreadsheet.
It is committed here so it is versioned and reviewable, not because anything in
the Next.js app imports it.

## Install

1. Create a spreadsheet. Rename the first tab to `Prospects`.
2. Extensions → Apps Script. Delete the placeholder `myFunction`, paste all of
   `Code.gs`, save.
3. Project Settings → Script Properties → Add script property:
   - name `BAPITA_OUTREACH_SECRET`
   - value: the same string as the `OUTREACH_SECRET` env var on the Vercel
     project `bapita-book` (Production scope).
4. Back on the sheet, reload the tab. A `Bapita` menu appears.
5. `Bapita` → `Set up sheet`. Google asks for authorization the first time:
   review permissions, choose the account, Advanced → Go to project → Allow.
   It needs to read and write this spreadsheet and to call book.bapita.com.

## Use

1. Fill `query` (business name plus city, or a Maps link), optionally `notes`
   (a vibe note, same idea as the admin intake's vibe field), `lang` (`he` or
   `en`, blank means `he`), and `instagram` if you already know the handle.
2. Tick `pick` on the rows you want.
3. `Bapita` → `Enrich selected`. Free, Places only. Fills columns F to O.
4. Tick the ones worth building. `Bapita` → `Create sites for selected`. Costs
   an LLM call per row. Fills P to S. A row that already has a `business_id` is
   skipped, so re-running a partial batch is safe.
5. `Bapita` → `Write openers for selected`. Costs an LLM call per row. Fills
   T to X and sets `status` to `ready`.
6. Send: for `whatsapp`, click `action_link` and the message is prefilled. For
   `instagram`, copy `message_he` and open `action_link`. Then set `status` to
   `sent` yourself.

## Notes

- The script sleeps ~2s between rows to stay under Groq's roughly 30 requests
  per minute, and stops before the Apps Script 6 minute execution limit. Run the
  same menu item again to continue: completed rows are skipped.
- One bad row never kills a batch. Failures land in `last_error` with
  `status = error`.
- `message_en` is a `=GOOGLETRANSLATE` formula for your reading only. The script
  never reads it. Machine translation is not send quality: never send it.
- Headers are read by name, so columns can be reordered without editing the
  script. Do not rename them.
```

- [ ] **Step 3: Install and smoke test on one row**

Follow the README. Run `Set up sheet`, then put one real business into `query`, tick `pick`, and run all three menu items in order. Confirm the row fills, `status` reaches `ready`, and clicking `action_link` opens WhatsApp with the message prefilled.

- [ ] **Step 4: Commit**

```bash
git add scripts/sheets/
git commit -m "feat(outreach): Apps Script sheet runner and setup README

The sheet is the control surface and the batch runner: per-row state lives in
the cells, so a partial batch is resumable and one bad row never kills a run."
```

---

## Task 11: Live run on three real prospects

**Files:** none.

- [ ] **Step 1: Run three real prospects end to end**

Pick three real Israeli businesses, ideally one per segment (`no_web`, `ig_only`, `has_site`). Run enrich, site, message.

- [ ] **Step 2: Check each generated site by hand**

For each `site_url`: the page loads, the name and address are right, the services are plausible, nothing is invented, and the page carries `noindex` (it is a draft, so Task 1 covers it):

```bash
curl -s <site_url> | grep -i 'name="robots"'   # expect: noindex, follow
```

- [ ] **Step 3: Check each message by hand before sending**

Read all three end to end. Confirm: one real fact in the opener, nothing invented, **no dash or hyphen outside the URL**, the `ig_only` message never implies they lack a presence, and the tone is something you would send under your own name. Fix the templates in `src/lib/outreach/message.ts` and re-run rather than editing the cell, so the fix carries to the next batch.

- [ ] **Step 4: Send, and record what came back**

Send the three, set `status` to `sent`. Note in the spec's "Known gaps" section what the actual Groq token spend was for the batch, which is the open question about batch size.

---

## Known gaps carried from the spec

These are accepted, not oversights:

- **Groq free tier daily token cap** is the real ceiling on batch size. Unknown until 50 prospects run in one day.
- **Places ToS limits long term caching** of Places fields (`place_id` is storable indefinitely, most other fields are not). `fetchPlaceProfile` is deliberately uncached; the sheet's copy is the same exposure that already exists from manual copy pasting, now automated.
- **A leaked `OUTREACH_SECRET`** can create draft businesses and burn LLM quota. It cannot publish, read bookings, read customers, or touch a live tenant.
- **Slug changes on conversion** leave a dead old URL. No redirect handling exists. Minor.
- **No free way to find an Instagram handle** when Maps carries no Instagram link. The `instagram` column stays manual. No scraping.
- **`message_en` is machine translated** and not send quality, by explicit choice. Read only. If English messages ever need to be sent, the opener must come from the LLM in both languages instead: one call returning `{ opener_he, opener_en }`, roughly 40 extra tokens.
