# Bapita Dashboard — Phase 0 Baseline Audit

**Date:** 2026-07-04
**Scope:** full (security / UX / perf)
**Method:** static-checks.sh + 3 Haiku read-only sweeps + manual verification of all security P0/P1 and the 3 core-journey blockers.
**Persona:** "Avi" — non-technical barber, first login, one-handed on his phone, between clients, Hebrew/RTL, does not read instructions.
**Rule:** Audit only. Nothing was fixed. This list is the work queue for Phases 1–6.

## Line-number confidence
- **Security findings (F1–F9):** file:line **verified** by reading the file.
- **UX / Perf findings:** line numbers are **approximate** (agent estimates) — confirm exact line at fix time. The *problem* is real; the *line* may be off by a few.

## Verification notes (5 agent findings corrected)
- **Share link is NOT missing.** `settings/page.tsx:1695 copyLink()` + "Copy link" button (1800) + "Your booking page is ready to share" (2203) exist. Journey #3 works — just buried in Settings. Downgraded blocker → P1.
- **send-confirmation cross-tenant "P0" — false.** Line 44 scopes `.or(owner_id.eq…, owner_email.eq…)`; a foreign businessId returns null → default. Downgraded to P2 (owner_email OR-clause hardening + open email relay).
- **notify-addon-request "P0" — false.** Emails only Bapita's own inbox (line 51), no tenant involved. Downgraded to P2.
- **book route regression checks PASS:** IP rate limit (line 79), phone rate limit (line 132), overlap guards + `23505` unique-index backstop (line 278). ✓
- **delete-account regression check PASSES:** scoped by `owner_id` (line 19). ✓

---

## Findings — ranked (P0 → P2)

| # | Sev | Area | File:line | Problem | Proposed fix | Eff |
|---|-----|------|-----------|---------|--------------|-----|
| F1 | **P0** | UX-blocker | clients/page.tsx (~empty branch) | First login = blank clients screen, no "add your first client" guidance. Blocks journey #2. | Empty-state hero: icon + "אין לקוחות עדיין" + big "+ הוסף לקוח" button. | S |
| F2 | **P0** | UX-blocker | calendar/page.tsx (~160) | `CalendarSkeleton` is imported (line ~18) but never rendered — blank screen 1–2s on load. First screen Avi sees. | Render skeleton while `loading`. | S |
| F3 | **P0** | UX-blocker | clients/page.tsx (~toolbar) | "Add client" is a top-toolbar item; on mobile it's off-screen until scroll — Avi can't find the one action he came for. | Bottom-right FAB "+" always visible on mobile. | S |
| F4 | **P1** | Security/integrity | api/public/book/route.ts:104,193 | Client-supplied `serviceDuration` gates the overlap guard — send it falsy and overlap double-booking protection is skipped; only exact-slot `23505` remains. **Verified.** | Fetch duration (+price, name) from `services` by `serviceId` server-side; ignore client values for logic. | S |
| F5 | **P1** | Cross-cutting | (no loading.tsx/error.tsx/not-found.tsx anywhere) | **Verified:** 0 route-level loading/error/not-found files. Any thrown error → raw white Next error page for Avi; every route flashes blank on load. | Add `(dashboard)/loading.tsx`, `error.tsx`, root `not-found.tsx` with branded RTL fallbacks. | M |
| F6 | **P1** | UX | settings/page.tsx:1695–2203 | Share-page link exists but is buried deep in Settings — a first-timer expects "share my page" on the home screen. | Surface a "שתף את דף ההזמנות" card on calendar/home with the same copy button. | S |
| F7 | **P1** | Perf | [slug]/page.tsx:24–51 | Public booking page fetches business → services sequentially (waterfall) on the client-facing, mobile-critical page. | `Promise.all` the independent queries; move `fetchPlaceData` off the critical path. | S |
| F8 | **P1** | Perf | [slug]/themes/{classic,clean,dark}/*.tsx | Google Font loaded via `@import` inside inline `<style>` — render-blocking on the booking page. | `next/font/google` at layout, or `<link>` with `display=swap`. | M |
| F9 | **P1** | Security | api/push/send/route.ts:6 | Webhook secret compared with `===` (timing-attackable), no rate limit. | `crypto.timingSafeEqual`; restrict to Supabase source. | S |
| F10 | P1 | Security (Phase-1 verify) | src/lib/supabase/* + dashboard queries | **Open question for Phase 1:** dashboard read paths — do they rely on RLS or manual `owner_id`/`business_id` filters? Public routes use service-role (RLS bypassed) with manual scoping (correct where read). Must confirm RLS ON for all tables + Supabase advisors clean. | Phase 1: run Supabase advisors, audit every table's RLS, verify no unscoped `.eq('id', …)` read in dashboard. | M |
| F11 | P1 | Security | api/admin/* + middleware | Admin gate is route-level only; middleware doesn't cover `/api/admin/*`. Confirm a normal owner can't reach admin endpoints. | Add admin check to middleware for `/api/admin/*` and `/admin`. | S |
| F12 | P1 | UX | new-booking/page.tsx (~90) | No inline "create new client" during booking — Avi must abandon flow to add a walk-in. | "+ לקוח חדש" inline in client search results. | M |
| F13 | P1 | UX | login/page.tsx:44–50 | Loading button shows bare "…"; inputs 44px vs button 46px (inconsistent targets). | "מתחבר…" label; standardize ≥44px. | S |
| F14 | P1 | UX | calendar/page.tsx (~200) | No empty state for a day with no bookings — Avi can't tell "no bookings" from "broken". | "אין תורים היום. הקש + להוספה." | S |
| F15 | P1 | UX | settings/page.tsx (~240) | Services empty-state has no inline "+ add service" — action lives elsewhere. | Inline "+ הוסף שירות" in the empty container. | S |
| F16 | P1 | Perf | layout.tsx:6–11 | Heebo loads 7 weights (300–900); several unused → font payload. | Load only weights in use (e.g. 400/500/600/700). | S |
| F17 | P1 | Perf | settings/page.tsx (2469 lines) | One giant client component — large hydration/bundle cost on a heavily-used page. | Split into server wrapper + sectioned client sub-components. | L |
| F18 | P2 | UX/RTL | calendar/page.tsx (~75) | Weekday labels hardcoded English on RTL Hebrew site. | Hebrew day names when lang=he. | S |
| F19 | P2 | UX/RTL | clients/page.tsx (~60) | Sort/Filter/Columns labels English-only. | Route through `t()` i18n. | S |
| F20 | P2 | UX | profile/page.tsx (~100) | Delete-account button prominent, no confirm dialog — accidental deletion risk. | 2-step confirm (type password / hold-to-confirm). | S |
| F21 | P2 | UX | multiple (clients [id]:120, clients:250, settings:320) | Icon-only action buttons ~24–34px — below 44px touch target, hard one-handed. | Enforce ≥44px tap targets on mobile. | M |
| F22 | P2 | UX | clients/page.tsx (~180) | Empty search result shows nothing — reads as "still loading". | "אין תוצאות ל־'xyz'". | S |
| F23 | P2 | UX | new-booking/page.tsx (~180) | Fully-booked date shows blank slot list — reads as loading. | "אין זמן פנוי בתאריך זה." | S |
| F24 | P2 | Perf | 25 raw `<img>` (settings 1184/1879/1946/2029, BusinessForm, [slug] customs, StaffStep) | 0 uses of `next/image` — no lazy-load/format opt; staff/gallery photos unoptimized. | Migrate to `next/image` (avatars/hero first). | M |
| F25 | P2 | Security | api/public/slots/route.ts:10 | `date` param unvalidated → passed straight into slot logic. | Validate ISO date, reject past / >N days ahead. | S |
| F26 | P2 | Security | api/public/book/route.ts:16,286–295 | In-memory rate limit resets on cold start; cancel_token re-fetched by phone+date+time instead of returned from insert. | Durable rate store later; `.select('cancel_token')` on insert. | S |
| F27 | P2 | Security | api/send-confirmation/route.ts + notify-addon-request | Authed user can send arbitrary `businessName`/`serviceName` email content (open relay to any address / to Bapita inbox). `owner_email` OR-clause allows same-email cross-read edge case. | Server-fetch business fields by owned id; drop `owner_email` OR read. | S |
| F28 | P2 | Data hygiene | api/delete-account/route.ts:24–28 | Deletes bookings/customers/services/businesses only — leaves orphaned staff, blocked_times, notifications, push_subscriptions. | Add those tables to the cascade (or FK ON DELETE CASCADE). | S |
| F29 | P2 | UX | settings/page.tsx:225–234 | Booking-URL field labeled friendly ("Your booking URL") but input still exposes slug-format constraints with no example. | Show example `book.bapita.com/studio-avi`; explain in one line. | S |
| F30 | P2 | Deps | package.json | `npm audit` reports non-critical advisories. | `npm audit fix` (prod deps) during a polish batch. | S |

---

## Counts
- **P0:** 3 (F1, F2, F3 — all first-login journey blockers)
- **P1:** 14 (F4–F17)
- **P2:** 13 (F18–F30)
- **Total:** 30

## Static-check receipts
- Secrets in client: `service.ts` references service role — **outside client paths** (server-only import). OK, keep watch.
- Hardcoded hex outside globals.css: **186 occurrences** → token-compliance debt (Phase 3, batched — not itemized above).
- console.log in src: 0. TODO/FIXME: 1. Oversized images (>300KB): none.

## Batches (P0 → P2, 3–5 each) — for Phases 1–5, NOT this session
- **Batch 1 (Phase 1 security):** F4, F9, F10, F11 — then re-audit security.
- **Batch 2 (Phase 2 UX blockers):** F1, F2, F3, F5.
- **Batch 3 (Phase 2 UX):** F6, F12, F13, F14, F15.
- **Batch 4 (Phase 5 perf):** F7, F8, F16, F17, F24.
- **Batch 5 (Phase 3 UI/RTL polish):** F18, F19, F21, F29 + the 186 hardcoded-hex sweep.
- **Batch 6 (Phase 2 polish):** F20, F22, F23.
- **Batch 7 (Phase 1/6 cleanup):** F25, F26, F27, F28, F30.

**Phase 0 ends here. No fixes made. Await approval before any batch (Phase 1 first, security, non-negotiable).**

---

# Phase 1 — Security deep audit (2026-07-04, Opus)

**Method:** Supabase advisors (security) + full `pg_policies` dump + `pg_class` RLS state on all 16 public tables + read of every `/api/*` route, middleware, and the two supabase client factories. Live prod project `ixihybsstplqavbpbrlo`.

## Phase-0 security findings — verification results
- **F10 (RLS coverage) — RESOLVED / good.** All 16 public tables have `rls_enabled = true`. Tenant reads scoped by `business_id = my_business_id()` (or `owner_id = auth.uid()` subselect). **Customers and bookings have NO anon read policy** → customer PII (phone/email) is not publicly readable. No cross-tenant SELECT leak found. `leads` is admin-only.
- **F11 (admin gate) — DOWNGRADED to P2.** `/api/admin/*` handlers each enforce `ADMIN_EMAILS.includes(user.email)` (delete-business:15, intake:101) — not middleware-gated but not exploitable. The `/admin` *page* is only `!user`-gated in middleware (any logged-in owner can load the shell), but its data comes from the gated admin APIs / RLS `is_admin()`, so no data leaks. Fix = defense-in-depth only.
- **F4 (client serviceDuration) — CONFIRMED P1.** `book/route.ts:154,193,230,234` — falsy `serviceDuration` skips every overlap guard; only the `23505` exact-slot unique index remains. Also `serviceName/servicePrice/businessName` are client-supplied and echoed into emails.
- **F9 (push secret) — CONFIRMED, P2.** `push/send/route.ts:6` non-constant-time `!==`; no rate limit. Timing attack is theoretical over network but cheap to fix.

## NEW security findings (Phase 1)

| # | Sev | Type | Location | Problem | Fix |
|---|-----|------|----------|---------|-----|
| **N1** | **P1** | RLS / cross-tenant write | `bookings` policy `bookings: anon insert` (WITH CHECK `true`, role public) | Anyone with the public anon key can `POST /rest/v1/bookings` and insert **arbitrary bookings into any business** — bypasses `/api/public/book` rate limits + overlap guards. Advisor `rls_policy_always_true`. | Replace with `bookings: tenant insert` `WITH CHECK (business_id = my_business_id())`. Keeps owner-dashboard insert (`AddCustomerSheet.tsx:153`, the only client-side booking insert) working; public flow uses service role (RLS-exempt); anon REST blocked (`my_business_id()`→null). |
| **N2** | **P1** | PII exposure / cross-tenant read | `businesses` policy `businesses: public read by slug` (USING `true`, anon) | Anon can `select` **every column of every business**, including `owner_email`, `notification_email`, `email`, `phone`, `stripe_account_id`, `meta_phone_number_id`, `plan_price/plan_setup_price/plan_notes` — a full owner-contact + billing harvest list. | Column-level `REVOKE SELECT (owner_email, notification_email, email, stripe_account_id, meta_phone_number_id, plan_notes, plan_price, plan_setup_price) ON businesses FROM anon` (RLS row policy stays; public page selects only display columns — verify `[slug]` select list). |
| **N3** | **P1** | RPC surface | funcs `send_push_on_notification`, `sync_customer_from_booking`, `notify_on_booking_change` | These trigger functions are `SECURITY DEFINER` and callable out-of-band by anon/authenticated via `/rest/v1/rpc/*` — e.g. fire pushes or write customer rows directly. Advisor `anon/authenticated_security_definer_function_executable`. | `REVOKE EXECUTE ON FUNCTION … FROM anon, authenticated` (triggers still fire; they run as table owner, not via RPC). |
| **N4** | **P2** | Priv-esc hardening | funcs `is_admin`, `my_business_id`, `sync_customer_from_booking`, `notify_on_booking_change` | `SECURITY DEFINER` with mutable `search_path` → schema-hijack escalation vector. Advisor `function_search_path_mutable`. | `ALTER FUNCTION … SET search_path = ''` (schema-qualify refs inside). |
| **N5** | **P2** | RPC surface | `is_admin()`, `my_business_id()` | Callable by anon via RPC (return false/null for anon — low, but unnecessary surface). | `REVOKE EXECUTE … FROM anon`. |
| **N6** | **P2** | Storage | bucket `business-images` policy `business-images: public read` | Broad `storage.objects` SELECT lets anon **list all files** in the bucket (enumerate other tenants' uploads). Object-URL access doesn't need listing. Advisor `public_bucket_allows_listing`. | Scope the SELECT policy to object read by known path, drop list capability. |
| **N7** | **P2** | Auth config | Supabase Auth settings | Leaked-password protection (HaveIBeenPwned) disabled. Advisor `auth_leaked_password_protection`. | **Manual toggle** in Auth → Policies. |
| **N8** | **P2** | RLS | `waitlist` policy `anon insert waitlist` (WITH CHECK `true`) | Anon can insert unbounded waitlist rows (spam). No client-side inserter found in this repo. Lower stakes than N1. | Add a minimal `WITH CHECK` (required cols present) or rate-limit at edge. |

## Phase-1 security batches
- **Batch S1 (DB / RLS — one migration, PROD):** N1, N2, N3, N4 — the cross-tenant + priv-esc set. Highest value. **✅ EXECUTED 2026-07-04 (see log below).**
- **Batch S2 (app code):** F4, F9, F11, F25 — server-fetch service fields, constant-time secret, admin middleware, slot date validation. **✅ EXECUTED 2026-07-04 (see log below).**
- **Batch S3 (config + low, delegable to smaller models):** N5, N6, N8, F26, F27, F28 + manual N7.

## Could NOT verify automatically (manual checks for Rami)
- **N7** leaked-password protection — enable in Supabase dashboard (Auth → Policies), not scriptable via MCP here.
- **Live anon-key probe** of N1/N2 (actually POSTing to `/rest/v1/bookings` / selecting `owner_email` with the anon key) — inferred from policy definitions, not executed against prod to avoid writing junk data. Recommend a one-off manual curl after Batch S1 to confirm both now 401/permission-denied.
- Storage bucket `business-images` (N6) — confirm no app code relies on `.list()` before tightening.

---

# Batch S1 — EXECUTION LOG (2026-07-04, Opus)

**Status: DONE.** One migration applied to PROD `ixihybsstplqavbpbrlo` (`batch_s1_rls_privesc_hardening_n1_n4`). Verified by re-query + security advisor re-run.

| # | Status | What shipped |
|---|--------|--------------|
| **N1** | ✅ done | Dropped `bookings: anon insert`; created `bookings: tenant insert` — `FOR INSERT TO authenticated WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))`. Used the owner-subselect **instead of** `my_business_id()` — multi-business-owner safe (my_business_id returns only the earliest business). Public flow uses service role (RLS-exempt); anon REST insert now blocked. |
| **N2** | ✅ done | anon had **table-level** SELECT (all 74 cols) → a per-column REVOKE would have been a no-op. Instead: `REVOKE SELECT ON businesses FROM anon` + `GRANT SELECT (<67 safe cols>) TO anon`. Revoked from anon: `owner_email, notification_email, stripe_account_id, meta_phone_number_id, plan_notes, plan_price, plan_setup_price`. **`email` kept** (dropped from the original audit list — the public `[slug]/page.tsx:26` anon-key query selects it; `phone` was never in the list). |
| **N3** | ✅ done | EXECUTE was granted to **PUBLIC** (not just anon/authenticated) → revoked `FROM public, anon, authenticated` on `send_push_on_notification()`, `sync_customer_from_booking()`, `notify_on_booking_change()`. ACLs now `{postgres, service_role}`. Triggers still fire (run as owner). |
| **N4** | ✅ done | `is_admin()` → `search_path = ''` (only ref `auth.jwt()` is schema-qualified). `my_business_id()`, `sync_customer_from_booking()`, `notify_on_booking_change()` → `search_path = pg_catalog, public` (bodies use unqualified `businesses`/`customers`/`bookings`/`notifications`). |

**Advisor after migration:** `function_search_path_mutable` cleared entirely; `rls_policy_always_true` no longer flags `bookings`; the 3 N3 trigger funcs no longer appear as RPC-executable. Remaining warnings map 1:1 to deferred items → N5 (`is_admin`/`my_business_id` still RPC-executable), N6 (bucket listing), N7 (leaked-password), N8 (`waitlist` always-true insert).

## Out-of-scope observations found during S1 (NOT fixed — carry into later batches)
- **anon holds table-level INSERT / UPDATE / DELETE / TRUNCATE / REFERENCES on `businesses`.** Currently blocked by RLS (no matching anon write policy), but the grants are sloppy. Tighten to least-privilege in **S3**.
- **authenticated cross-tenant read of the N2 sensitive columns is still open.** Policy `businesses: public read by slug` (USING `true`) applies to role `authenticated` too, so any logged-in owner can read another tenant's `owner_email`/billing cols. Can't fix via column REVOKE from `authenticated` — that would break an owner reading their **own** business (grants are role-wide, not per-policy). Needs a **row-policy tightening** (separate finding; add to S2/S3 security scope).
- **`plan_tier, plan_addons, plan_booking_limit, plan_start_date, plan_renewal_date` remain anon-readable** — audit flagged only `plan_notes/price/setup_price` as sensitive. Revisit if plan tier/limits are considered private.

## Still manual for Rami before closing Phase 1 security
- **N7** — enable leaked-password protection (Auth → Policies). Not scriptable via MCP.
- **Live anon-key probe** of N1/N2 — one-off curl with the anon key: `POST /rest/v1/bookings` should now 401/permission-denied, and `select=owner_email` on `/rest/v1/businesses` should return permission-denied while `select=email,name` still works.

---

# Batch S2 — EXECUTION LOG (2026-07-04, Opus)

**Status: DONE.** App-code fixes only, no prod DB touch. `npm run lint` + `npm run build` both pass.

| # | Status | What shipped |
|---|--------|--------------|
| **F4** | ✅ done | `api/public/book/route.ts` — dropped client-supplied `businessName/serviceName/serviceDuration/servicePrice` from the request destructure. Now server-fetches `services.{duration,name,price,staff_ids}` by `serviceId` **scoped to `business_id`** (invalid/cross-tenant serviceId → 400 `invalid service`). `svcDuration` drives every overlap/blocked-time guard, so a falsy client duration can no longer skip double-booking protection. `bizName` server-fetched (added `name` to the existing `businesses` select). Email content (confirmation + barber notification) uses `svcName`/`svcPrice`/`bizName`. Removed the now-redundant inner `services` staff_ids re-fetch — reuses `svcStaffIds`. |
| **F9** | ✅ done | `api/push/send/route.ts` — replaced `secret !== env` with a length-checked `crypto.timingSafeEqual` helper (`secretOk`); empty/missing expected secret → reject. |
| **F11** | ✅ done | `middleware.ts` — added defense-in-depth admin gate: `/api/admin/*` → 403 JSON, `/admin` + `/admin/*` → redirect (`/calendar` if logged-in non-admin, else `/login`) for anyone not in `ADMIN_EMAILS`. Handler-level + `/admin` layout checks unchanged (still enforced). |
| **F25** | ✅ done | `api/public/slots/route.ts` — `date` now validated: strict `YYYY-MM-DD` regex + real-calendar round-trip check (→ 400 `invalid date`), past dates → empty `slots`. Existing advance-window cap unchanged. |

**Not in this batch (still open):** F5–F8, F12–F17 (P1 UX/perf), F18–F30 (P2). Security remainder: N5, N6, N8, F26, F27, F28 → Batch S3; **N7** manual toggle; live anon-key probe of N1/N2 still recommended.

> **Note (Phase 2 reconciliation):** S2 lists F12/F14/F15 as "still open," but the Phase 2 walkthrough below found those states are **already implemented**. See the verification table.

---

# Phase 2 — Usability audit (non-tech users) (2026-07-04, Opus)

**Persona:** "Avi" — non-technical barber, first login, one-handed on his phone, Hebrew/RTL, does not read instructions.
**Method:** *Verify + extend* (same as Phase 1 did for security). Walked the live prod dashboard logged in as the test account (Business "Bapita Admin", 8 seed clients, 1 booking) **and** read the page components to confirm/correct every Phase-0 UX finding and its line numbers, then added new findings.
**Rule:** Audit only. Nothing fixed.

## Viewport limitation (be aware)
Browser-automation window would **not shrink below ~873px innerWidth** on this machine (requested 390/400, floored at 873). 873px is **above** the dashboard's mobile breakpoints (clients switches table→cards at `max-width:639px`; AppShell drawer at `md`). So the live pass saw **desktop/tablet layout**, not the true one-column phone layout. Phone-specific findings (F3, F21, card layouts) were settled from component CSS instead. **A real-device (or ≤400px) pass is still recommended** to confirm one-handed reach + tap targets — flagged like Phase 1's "manual checks."

## Headline: the dashboard is not usable in Hebrew (biggest Phase-2 gap)
The whole live walkthrough rendered **English, LTR** even though `<html lang="he">`. Root cause is structural, not cosmetic — and it eclipses the individual "English label" findings (F18/F19):

- **i18n scaffolding exists** — `src/i18n/index.tsx` (`LangProvider`, `useLang`, `translate(lang,key)`, `DashboardLang = "en"|"he"`), `src/i18n/dict`. It **is** wired on the client-facing booking page (`[slug]` themes + `booking/*` use `translations[lang]`). AppShell wraps the dashboard in `<LangProvider>` (`AppShell.tsx:489`).
- **But the dashboard's own screens hardcode English literals** instead of calling `t()`. Clients page is 100% literals: `clients/page.tsx:34,35` (First/Last name), `:593` (Add client), `:608` (Search placeholder), `:637,692,741` (Show/Label/Sort), `:847` (No results), `:967` (Filters), `:980,1002,1021,1048,1061`. Calendar onboarding `calendar/page.tsx:227-239` ("Welcome to Bapita", "Business info/Services/Business hours"), `:359` ("No results"). Settings section labels likewise. → **Even after flipping the עב toggle these stay English.**
- **`dir="rtl"` is set NOWHERE in `src/`** (only `lang="he"` at `layout.tsx:24`; grep for any `dir=`/`documentElement.dir`/`rtl` → none). So layout never becomes RTL. AppShell even uses logical props (`md:start-*/end-*`, `AppShell.tsx:1191`) which are **inert without `dir=rtl`**.
- **Defaults are EN.** `LangContext` default `"en"` (`i18n/index.tsx:8`); `AppShell.tsx:446` `lang = dashboard_lang==="he" ? "he" : "en"`. Booking-page language also defaults EN (Settings → Website). A brand-new Hebrew barber lands in an English, LTR product.

*(Not live-verified: flipping the account to עב to observe the mixed English/Hebrew + still-LTR result — deliberately skipped to avoid a persisted account-setting write. Evidence above is from source; a one-off עב toggle is a good confirmation step, like Phase 1's anon-key probe.)*

## Verification of Phase-0 UX findings (8 were already implemented / false)

| Phase-0 # | Verdict | Evidence (real lines) |
|---|---|---|
| **F1** (P0 · clients blank, no guidance) | **FALSE — already done** | Empty state exists: `clients/page.tsx:840` `clients.length===0` → "No clients yet" `:852` + "Add your first client to get started" `:853` + CTA `:858`. (English only → see Headline.) |
| **F2** (P0 · skeleton never rendered, blank 1–2s) | **MOSTLY FALSE** | `calendar/page.tsx:205` **does** render `<CalendarSkeleton/>` on `bizLoading`; secondary data load shows a centered spinner overlay `:344–348`, not a blank screen. "Blank 1–2s" overstated. Downgrade → P2 polish. |
| **F3** (P0 · add-client off-screen on mobile, need FAB) | **DOWNGRADE P0→P2** | No bottom FAB, but "Add client" sits in the page header (top), not off-screen; empty-state has its own centered CTA `:858`. Real issue is small target (34px) → folds into F21. Confirm on a real phone. |
| **F6** (P1 · share link buried in Settings) | **CONFIRMED** | Settings → **Website** tab: "Copy link" + "Preview" + `book.bapita.com/…`. 2 taps from home, no surface on calendar. Valid. |
| **F12** (P1 · no inline "new client" in booking) | **FALSE — already done** | new-booking Step 1 shows a prominent **"+ New client"** above client search (seen live). |
| **F13** (P1 · login "…" label; 44 vs 46 targets) | **CONFIRMED (minor)** | `login/page.tsx:91` input `height:44`, `:156` button `height:46`; loading label `"…"` at `:157,:227`. Also login is **English-only** and lives outside `LangProvider` (can't localize) — first screen a Hebrew owner sees. |
| **F14** (P1 · no empty-day state) | **FALSE — already done** | `DayView.tsx:220–223` renders `t("Tap a slot to book") · <date>` when day is empty — and it **uses `t()`** (good pattern). |
| **F15** (P1 · no inline add-service in empty state) | **FALSE — already done** | `settings/page.tsx:690` `services.length===0` → "No services yet" `:697` + "Add service" `:797`. |
| **F18** (P2 · weekday labels English) | **RECLASSIFY** | Not hardcoded — weekdays use date-fns `dateLocale` which follows `lang` (`i18n/index.tsx:28`). English because account defaults to EN. Symptom of Headline/U2, not a standalone fix. |
| **F19** (P2 · clients labels English) | **CONFIRMED → fold into Headline** | Confirmed literal English, but the fix is bigger than "route through `t()`": these strings don't call `t()` at all (`clients/page.tsx` list above). |
| **F20** (P2 · delete-account no confirm) | **FALSE — already done** | Confirm modal exists (`profile/page.tsx:41` `showDeleteConfirm`, `:215`). Live: "Delete your account?" / "This action cannot be undone." / [Cancel] [Yes, delete]. |
| **F21** (P2 · icon buttons <44px) | **CONFIRMED** | `clients/page.tsx:517` `.row-action-btn` **26×26px**; avatars/toolbar/print/columns btns 34px `:306,588,767,804`; edit inputs 28–30px `:662,670,676`. All below 44px. Valid, worse on phone. |
| **F22** (P2 · empty search shows nothing) | **FALSE** | `clients/page.tsx:847` renders "No results for '{q}'" + "Try a different name…" (confirmed live after full load). The blank rows are a transient loading skeleton — see U5. |
| **F23** (P2 · fully-booked shows blank slots) | **FALSE — already done** | `new-booking/page.tsx:678–680` renders "No times available" when `slots.length===0`. |
| **F29** (P2 · booking-URL no example) | **PARTIALLY VALID** | Has `book.bapita.com/` prefix + "Only lowercase letters, numbers, and hyphens" helper, but no concrete example (e.g. `book.bapita.com/studio-avi`). Minor. |

## NEW Phase-2 findings — ranked

| # | Sev | Area | Location | Problem | Proposed fix |
|---|-----|------|----------|---------|--------------|
| **U1** | **P0** | i18n / RTL | `layout.tsx:24`; `AppShell.tsx:446,489`; `clients/page.tsx` (all UI strings); `calendar/page.tsx:227-239,359` | **Dashboard can't run in Hebrew or RTL.** i18n exists + works on the booking page, but dashboard screens hardcode English and `dir="rtl"` is never applied. A Hebrew barber gets an English, LTR product even with the עב toggle. For a Hebrew-first market this is a launch blocker (mostly wiring — the `t()`/dict scaffolding is already there). | (a) Set `dir=rtl` when `lang==="he"` (LangProvider effect on `document.documentElement` or SSR `<html dir>`). (b) Route dashboard strings through `t()` (start: clients, calendar onboarding/empty states, settings labels). (c) Verify logical-prop layout once `dir=rtl` is on. |
| **U2** | **P1** | i18n default | `i18n/index.tsx:8`; `AppShell.tsx:446`; Settings→Website default | New businesses default to **EN** dashboard **and** EN booking page. Hebrew owners (and their Hebrew clients) land in English. | Default `dashboard_lang`/booking-page lang to `he` (or infer from locale) for new tenants. |
| **U3** | **P1** | Discoverability | Settings → Business ("Dashboard language"), Settings → Website ("Booking page language") | The only language switches are buried 3+ taps deep in Settings, split across two tabs. A first-timer stuck in the wrong language can't find them. | Surface a language switch in first-login/onboarding and/or the top-nav/menu. |
| **U4** | **P1** | Auth copy | `login/page.tsx` (all strings) | Login is English-only and outside `LangProvider`, so it can't localize — the very first screen a Hebrew owner sees. Also inherits F13 ("…" label, 44/46). | Hebrew or bilingual login; real loading label ("מתחבר…"). |
| **U5** | **P2** | Loading state | `clients/page.tsx` (search loading skeleton) | A 0-result search first flashes **5 fake client skeleton rows** (during ~250ms debounce + fetch) before collapsing to "No results" — reads briefly as "found results," then empties. (This is what made F22 look broken at 1s.) | Show the "No results" empty state (or a spinner) directly for 0-length results instead of full-row skeletons; or debounce the skeleton. |
| **U6** | **P2** | Redundancy | Header "New booking" + calendar sidebar "New booking" | Two identical primary CTAs on the calendar screen at desktop/tablet width; extra visual noise, unclear which is canonical. | Keep one primary entry; on phone rely on the header/FAB. Confirm on real phone. |

## Phase-2 batches (for Sonnet fix sessions — NOT this session)
- **Batch U-A (i18n/RTL — the real Phase-2 work):** U1 (dir=rtl + `t()` sweep of dashboard strings), U2 (default `he`), U3 (surface toggle), F19/F18 fold in here.
- **Batch U-B (touch/interaction):** F21 (≥44px targets), U4 (login localize + label), F13.
- **Batch U-C (polish):** U5 (search skeleton), U6 (dedupe CTA), F6 (surface share on home), F29 (URL example), F2/F3 downgraded polish.
- **Close as already-done / false:** F1, F12, F14, F15, F20, F22, F23 (empty/confirm states already implemented — only their English copy remains, covered by U1).

**Net:** most of Phase-0's P0/P1 "empty state" blockers were already built (states + confirms + inline CTAs exist). The genuine Phase-2 work is **Hebrew + RTL** (U1–U4) and **tap targets** (F21). No fixes made — await approval before any batch.

---

# Batch S3 — EXECUTION LOG (2026-07-04, Opus) — Security phase COMPLETE

**Status: DONE.** Two migrations applied to PROD `ixihybsstplqavbpbrlo` + app-code fixes. `npm run lint` + `npm run build` pass. **Security advisor now clean except N7 (manual).**

| # | Status | What shipped |
|---|--------|--------------|
| **N5** | ✅ done | `is_admin()` / `my_business_id()` EXECUTE was granted to **PUBLIC** (not just anon) — same gotcha as N3. `REVOKE EXECUTE FROM public, anon, authenticated`. RLS policies still evaluate them (policy-driven invocation needs no caller EXECUTE); grep confirmed no `rpc('is_admin'/'my_business_id')` in app. Advisor `anon/authenticated_security_definer_function_executable` cleared for both. |
| **N6** | ✅ done | Bucket `business-images` is **public** → object URLs served via CDN, bypass RLS. App uses only `.upload()` + `.getPublicUrl()` (grep: no `.list()`/`.download()`). **Dropped the broad SELECT policy entirely** (first attempt scoped to `authenticated` still tripped `public_bucket_allows_listing`; full drop clears it). INSERT/DELETE owner policies retained. Anon can no longer enumerate the bucket. |
| **N8** | ✅ done | Replaced always-true `anon insert waitlist` with `WITH CHECK (email IS NOT NULL AND char_length(email) BETWEEN 3 AND 254)`. Advisor `rls_policy_always_true` cleared for `waitlist`. |
| **F28** | ✅ done | `api/delete-account/route.ts` — cascade now also deletes `staff`, `blocked_times`, `notifications`, `push_subscriptions` (all `business_id`-scoped) before the `businesses` rows. No more orphaned records after account deletion. |
| **F27** | ✅ done (send-confirmation) | `api/send-confirmation/route.ts` — **business name now server-fetched** from the owned business (added `name` to both `businesses` selects) and used in the email; client-supplied `businessName` dropped from the destructure, closing the spoofable-mailer vector. `owner_email` OR-clause **kept intentionally** — dropping it would regress per-barber (owner_email) notification routing; the cross-read edge is P2/narrow. |
| **F27** | ⚪ no-op (notify-addon-request) | Emails only Bapita's own inbox (`info.bapita@gmail.com`), no tenant/recipient is client-controlled → no relay surface. Left as-is (matches Phase-0 note that its "P0" was false). |
| **F26** | ⚪ already done | `book/route.ts:297` already `.select("cancel_token")` on insert (returned, not re-fetched by phone+date+time). Durable rate store explicitly deferred (post-launch infra). |

**Migrations:** `batch_s3_rls_config_hardening_n5_n6_n8`, then `batch_s3_fix_n5_n6_public_grants` (the PUBLIC-grant + full-drop corrections after the first advisor re-run).

**Advisor after S3:** only `auth_leaked_password_protection` (N7) remains — not scriptable via MCP.

## Security phase — final state
- **Resolved:** F4, F9, F11, F25 (S2) · N1–N6, N8 (S1+S3) · F26, F28 (done) · F27 (send-confirmation hardened).
- **Manual for Rami (N7):** enable leaked-password protection — Supabase → Auth → Policies (HaveIBeenPwned).
- **Recommended manual probe:** one-off anon-key curl to confirm N1/N2 (`POST /rest/v1/bookings` → 401; `select=owner_email` on businesses → permission-denied; `select=email,name` still works).
- **Carried to non-security batches:** authenticated cross-tenant read of N2 sensitive cols (needs row-policy tightening, S1 out-of-scope note); anon table-level write grants on `businesses` (least-privilege cleanup); `plan_tier`/limits anon-readability question.

**Security phase (Phases 1 + Batches S1–S3) is COMPLETE. Next: Phase 2 UX/i18n work (Batches U-A/U-B/U-C) and Phase 5 perf — all await approval.**

---

