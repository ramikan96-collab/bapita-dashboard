# Bapita Dashboard — Multi-Tenant Booking Platform

**Next.js 16.2.7**, Supabase backend, multi-tenant SaaS. dashboard.bapita.com. Deploy: Vercel project `bapita-dashboard`.

## Stack
- React 19.2.4, Tailwind 4
- Supabase (SSR client), Resend (email), Nodemailer, Web-Push
- OpenAI (assistants), Recharts (analytics dashboard)
- TypeScript 5, ESLint 9

## Public APIs
- `src/app/api/public/book` — booking creation endpoint
- `src/app/api/public/slots` — availability queries

## Git
- Remote: github.com/ramikan96-collab/bapita-dashboard (legacy org; slated for migration to info-bapita)

## Deploy Gotchas
1. **Vercel "Invalid Version"** — versionless `unrs-resolver` in package-lock.json causes build failure. Fix: regenerate lockfile.
2. **Preview env vars** — Supabase vars must be scoped to Preview environment. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, + service role key to Vercel Preview.
3. **Crons must be daily** — the Vercel account is on Hobby, which rejects any cron more frequent than once per day and **fails the whole deploy** before building. `vercel.json` is also schema-strict: no comment keys. The deposit-expiry cron (`/api/payments/greeninvoice/expire`) wants `*/5 * * * *` but is pinned to `0 3 * * *`. Restore the 5-minute schedule when deposits go live (needs Pro), or drop the cron and filter stale `pending_payment` bookings at slot-query time.
4. **Push does not reliably trigger a build** — the GitHub webhook has silently failed more than once. After pushing, confirm a deployment for your SHA actually exists; if not, deploy with `npx vercel deploy --prod --yes --scope team_8ibtIeAI5bZIZWls7F97nUuD`.

## Past Security Audits
- Rate limiting on `/api/public/book` (prevent abuse)
- Unique DB index against double-booking
- Delete account: removed owner_id column lingering after account deletion
Do not regress these fixes.


