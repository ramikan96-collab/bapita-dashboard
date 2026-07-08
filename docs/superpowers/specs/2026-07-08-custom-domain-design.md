# Custom Domains for Booking Pages — Design Spec

**Date:** 2026-07-08
**Repo:** bapita-dashboard (book.bapita.com)
**Status:** Approved, ready for implementation
**First customer:** Shimi Azut Hairstudio — domain `shimi-azut.com` (bought via Cloudflare)

## Goal

Let a business's booking page be served from its own custom domain instead of
`book.bapita.com/{slug}`. Admin-provisioned (not self-serve). The business owner
keeps editing their page from their existing dashboard exactly as today — the
custom domain serves the same `/[slug]` page, so all their edits reflect there
automatically.

**Definition of done:** `shimi-azut.com` (and `www.shimi-azut.com`) load Shimi's
booking page over HTTPS, the page is fully functional (services, booking flow,
gallery, etc.), Shimi's dashboard still controls it, and no existing behavior on
`book.bapita.com` or `dashboard.bapita.com` regresses.

## Architecture

Multi-tenant Next.js app on Vercel. Booking pages live at `src/app/[slug]/page.tsx`,
which resolves a business by `slug` from the Supabase `businesses` table and renders
`BookingShell` (client component; whole booking flow is client-side within one URL).
`src/middleware.ts` currently handles auth only — there is no host-based routing.

Custom domains are added by:
1. A Supabase host→business mapping (`custom_domain` column).
2. A middleware rewrite that maps a custom host to that business's `/{slug}` page.
3. Admin UI to set/verify the domain; Settings shows read-only status to the owner.
4. Manual per-domain steps in the Vercel dashboard + Cloudflare (done by Rami).

## Components

### 1. Data — Supabase migration

File: `docs/migrations/2026-07-08-custom-domain.sql`

Add to `businesses`:
- `custom_domain text unique` — apex host only, lowercase, **no** `www.` prefix
  (e.g. `shimi-azut.com`). Nullable.
- `custom_domain_verified boolean not null default false` — gate; middleware only
  routes a custom host when this is `true`.

```sql
alter table businesses
  add column if not exists custom_domain text unique,
  add column if not exists custom_domain_verified boolean not null default false;

create index if not exists businesses_custom_domain_idx
  on businesses (custom_domain) where custom_domain is not null;
```

Apply manually via Supabase (Rami applies migrations one by one).

RLS note: business edits already persist through `supabase.from("businesses").update(payload)`
under existing RLS. `custom_domain_verified` must **only** be writable by admin. If
RLS lets owners update their own row's arbitrary columns, verify that owners cannot
flip `custom_domain_verified` themselves (add a column-level policy or a DB trigger,
or write verification through an admin-only path). At minimum, do not expose the
verified toggle in the owner-facing Settings UI. Confirm the actual RLS policy before
shipping; if owners can self-verify, close that hole.

### 2. Routing — middleware host rewrite (the core)

Edit `src/middleware.ts`. Add host handling **before** the existing auth logic.

Logic:
1. `host = request.headers.get("host")?.toLowerCase() ?? ""`, then strip a leading
   `www.` → `bareHost`.
2. Define known hosts (normal behavior, skip custom-domain logic):
   - `book.bapita.com`, `dashboard.bapita.com`
   - `localhost` / `127.0.0.1` (any port)
   - any host ending in `.vercel.app` (preview/prod Vercel URLs)
3. If `bareHost` is NOT a known host → treat as custom domain:
   - Query `businesses` for `custom_domain = bareHost` AND `custom_domain_verified = true`
     AND status is active (match whatever "active" means in this table — check the
     `status` column values used elsewhere; `[slug]/page.tsx` selects `status` but does
     not filter on it, so confirm the allowed value(s)).
   - **Found:** if `pathname === "/"`, `NextResponse.rewrite(new URL('/' + slug, request.url))`.
     For any other pathname on a custom host, let it pass (assets, `_next`, `/api/public/*`
     all must keep working). Do not run the dashboard-auth branches for custom hosts.
   - **Not found:** `NextResponse.redirect("https://book.bapita.com")`.
4. Known hosts fall through to the existing auth/admin/dashboard logic unchanged.

Constraints:
- Reuse the Supabase client already constructed in middleware (or a lightweight
  anon client) for the lookup. One query per custom-host request — acceptable at
  current traffic. Flagged for caching later (see Open Questions).
- The middleware `matcher` already excludes `_next/static` and common image
  extensions; `_next/image` and `/api/public/*` are reachable and must be left
  alone on custom hosts.
- Do NOT let dashboard routes (`/calendar`, `/settings`, `/admin`, …) render on a
  custom host. Because we only rewrite `pathname === "/"` and redirect unknown
  custom hosts otherwise is not applied to sub-paths — decide explicitly: for a
  custom host, any non-root, non-asset, non-`/api/public` path should redirect to
  `https://book.bapita.com{pathname}` (so `shimi-azut.com/calendar` bounces to the
  real dashboard host instead of leaking a broken dashboard). Implement this bounce.

### 3. Admin UI — set + verify domain

Edit `src/app/(dashboard)/admin/businesses/_components/BusinessForm.tsx`.

- Add a "Custom domain" text input bound into the save `payload` as `custom_domain`
  (normalize on save: trim, lowercase, strip a leading `www.`, strip trailing slash;
  empty string → `null`). Uses the existing `supabase.from("businesses").update(payload)`
  path — no new API route.
- Add an admin-only "Domain verified" toggle → `payload.custom_domain_verified`.
- Add a static helper block showing the exact DNS setup for the customer:
  - Apex `A` record → `76.76.21.21`
  - `www` `CNAME` → `cname.vercel-dns.com`
  - Warning: in Cloudflare set both records to **DNS only (gray cloud)**, not proxied
    (orange cloud) — proxying breaks Vercel's SSL issuance.
- Follow existing form styling/patterns in this file (inline styles, `var(--color-*)`).

### 4. Owner-facing — Settings read-only status

Edit `src/app/(dashboard)/settings/page.tsx` (near the existing `book.bapita.com/{slug}`
field around lines 233 / 1770–1797).

- If the business has a `custom_domain`, display it with a status badge:
  `custom_domain_verified` → "Connected" (green); else → "Pending DNS" (amber).
- Read-only. No input, no verify toggle here (verification is admin-only, see RLS note).
- If no `custom_domain`, show nothing new (or a subtle "Want a custom domain? Contact us").

## Manual steps (Rami — per domain, documented not coded)

Do these once for `shimi-azut.com` as part of bring-up:
1. Vercel → `bapita-dashboard` project → Settings → Domains → Add Domain:
   add both `shimi-azut.com` and `www.shimi-azut.com`. Set `www` to redirect to apex
   (Vercel offers this at add time).
2. Cloudflare DNS for `shimi-azut.com`:
   - `A  @  → 76.76.21.21`  (DNS only / gray cloud)
   - `CNAME  www  → cname.vercel-dns.com`  (DNS only / gray cloud)
3. Wait for Vercel to show the domain as Valid + SSL issued.
4. In admin BusinessForm for Shimi: set `custom_domain = shimi-azut.com`, flip
   `custom_domain_verified = true`, save.
5. Verify: load `https://shimi-azut.com` and `https://www.shimi-azut.com` — both serve
   Shimi's booking page over HTTPS; booking flow works end to end.

## Out of scope (MVP)

- Vercel REST API automation (domain add/verify from the app). Manual dashboard for now.
- Self-serve domain provisioning by business owners.
- Per-host canonical/OG tags: `[slug]/page.tsx` still emits `bapita.com/{slug}` and a
  `bapita.com`-hosted OG image. These work under a custom host (absolute URLs resolve);
  they're just not the custom domain. Improve later by passing `host` into metadata.
- Cancel links: `api/public/book/route.ts` hardcodes `https://book.bapita.com/cancel/{token}`.
  Left as-is — cancellation happens on `book.bapita.com` and works regardless of the
  domain the booking was made from.

## Open questions / follow-ups

- **Middleware query caching:** one Supabase lookup per custom-host request. Fine at
  current volume; revisit with an in-memory/edge cache (or `unstable_cache`) if custom
  domains multiply.
- **`status` value:** confirm the exact active-status value(s) on `businesses` before
  gating the middleware lookup on status.
- **RLS on `custom_domain_verified`:** confirm owners cannot self-verify (see Data note).

## Acceptance criteria

- [ ] Migration applied; `businesses` has `custom_domain` + `custom_domain_verified`.
- [ ] Middleware rewrites verified custom apex + www hosts to `/{slug}`; unknown custom
      hosts redirect to `book.bapita.com`; known hosts behave exactly as before.
- [ ] Dashboard routes never render on a custom host (they bounce to `dashboard`/`book`).
- [ ] Admin can set + verify a custom domain and sees the DNS helper.
- [ ] Settings shows the owner a read-only connected/pending badge.
- [ ] `shimi-azut.com` + `www.shimi-azut.com` serve Shimi's booking page over HTTPS,
      fully functional, controlled by his existing dashboard.
- [ ] No regression on `book.bapita.com/*` or `dashboard.bapita.com/*`.
