-- Proof that a guest accepted the booking terms (Grow site review, consumer law).
--
-- ADDITIVE ONLY: four nullable columns, no existing column, constraint or row is touched.
-- bookings.terms_accepted_at      — guest ticked the terms box on the stay request form
-- payment_links.terms_accepted_at — guest ticked the terms box on the private pay page
-- *_terms_version                 — which terms text was accepted (STAY_TERMS_VERSION in src/lib/stay.ts)
--
-- Written only by server routes with the service role. No new grants: anon must not read these.

alter table public.bookings      add column if not exists terms_accepted_at timestamptz;
alter table public.bookings      add column if not exists terms_version     text;
alter table public.payment_links add column if not exists terms_accepted_at timestamptz;
alter table public.payment_links add column if not exists terms_version     text;

-- PostgREST caches the schema; make the new columns visible to the API right away.
notify pgrst, 'reload schema';
