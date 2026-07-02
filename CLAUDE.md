@AGENTS.md

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

## Past Security Audits
- Rate limiting on `/api/public/book` (prevent abuse)
- Unique DB index against double-booking
- Delete account: removed owner_id column lingering after account deletion
Do not regress these fixes.


