# Bapita Dashboard — Multi-Tenant Booking Platform

**Next.js 16.2.7**, Supabase backend, multi-tenant SaaS. book.bapita.com (`dashboard.bapita.com` is retired and 308-redirects). Deploy: Vercel project `bapita-book`.

## Stack
- React 19.2.4, Tailwind 4
- Supabase (SSR client), Resend (email), Nodemailer, Web-Push
- OpenAI (assistants), Recharts (analytics dashboard)
- TypeScript 5, ESLint 9

## Public APIs
- `src/app/api/public/book` — booking creation endpoint (branches to a stay-request path when `business_type = 'stay'`)
- `src/app/api/public/slots` — appointment time-slot availability
- `src/app/api/public/stay-availability` — blocked nights per rentable unit

## Business types
`businesses.business_type` is `appointment` (default) or `stay`, set by Bapita staff in the admin board.
A **stay** business reuses `services` as rentable units (`price` = nightly rate, `duration` unused) and
`bookings` as reservations (`appointment_date` = check-in, `check_out` set). All date logic lives in
`src/lib/stay.ts` — public page, booking API and dashboard all call it so availability cannot disagree
with itself. Checkout dates are **exclusive**: the checkout day is bookable as the next guest's check-in.
Run `npm run verify:stay` after touching that file.

## Git
- Remote: github.com/ramikan96-collab/bapita-dashboard (legacy org; slated for migration to info-bapita)

## Deploy Gotchas
1. **Vercel "Invalid Version"** — versionless `unrs-resolver` in package-lock.json causes build failure. Fix: regenerate lockfile.
2. **Preview env vars** — Supabase vars must be scoped to Preview environment. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, + service role key to Vercel Preview.
3. **Crons must be daily** — the Vercel account is on Hobby, which rejects any cron more frequent than once per day and **fails the whole deploy** before building. `vercel.json` is also schema-strict: no comment keys. The deposit-expiry cron (`/api/payments/greeninvoice/expire`) is pinned to `0 3 * * *` and is now only a janitor: availability reads ignore expired unpaid holds and `api/public/book` deletes them just-in-time (`src/lib/payment-holds.ts`), so slot correctness does not depend on cron frequency.
5. **`bookings_slot_unique` is a partial index — read it before you touch it.** As of 2026-08-22 it is `(business_id, appointment_date, appointment_time) WHERE check_out IS NULL AND status IN ('confirmed','pending')`. Two separate predicates, each load-bearing: the **status** half is what stops a cancelled row from holding its slot forever (expired deposit holds are still DELETED, not cancelled — keep it that way); the **check_out** half exempts stays, which all share a check-in time and would otherwise collide across units. Stay overlap is a range test and is enforced in `src/lib/stay.ts`, not by this index. This entry previously claimed the index had no status predicate, which was already false in production and nearly caused a regression — **verify against `pg_indexes` before writing a migration that touches it.**

4. **Push does not reliably trigger a build** — the GitHub webhook has silently failed more than once. After pushing, confirm a deployment for your SHA actually exists; if not, deploy with `npx vercel deploy --prod --yes --scope team_8ibtIeAI5bZIZWls7F97nUuD`.

6. **`anon` reads `businesses` through a COLUMN-LEVEL grant allowlist, not a table grant.** Adding a column to the `src/app/[slug]/page.tsx` select is therefore a TWO-part change: the column must also be `grant select (col) on public.businesses to anon`, or the anon query errors and that page turns every error into `notFound()` — a 404 on **every** public tenant page at once. This shipped as a live outage on 2026-08-22 (see `docs/migrations/2026-08-22-stay-anon-column-grants.sql`). Local `npm run build` will NOT catch it: builds use the service-role key, which bypasses column grants. Verify with an anon request or by checking `information_schema.column_privileges`.

## Past Security Audits
- Rate limiting on `/api/public/book` (prevent abuse)
- Unique DB index against double-booking
- Delete account: removed owner_id column lingering after account deletion
Do not regress these fixes.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
