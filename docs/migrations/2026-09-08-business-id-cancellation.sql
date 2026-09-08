-- Migration: business ID number + cancellation policy
-- Project: ixihybsstplqavbpbrlo (prod)
--
-- Two owner-editable fields, both surfaced on the public payment disclosure
-- (מכר מרחוק) shown at the point of payment:
--   business_id_number  — ת.ז / ח.פ / עוסק. Required before Green Invoice can
--                          be connected (gated in the connect route, not here).
--   cancellation_policy  — free text. Null/empty falls back to a default
--                          "up to 24 hours" line, resolved client-side.
--
-- Both must be readable by anon (public booking page renders them) — see
-- docs/migrations/2026-08-22-stay-anon-column-grants.sql for why a missing
-- grant here 404s every public tenant page.

begin;

alter table public.businesses
  add column if not exists business_id_number text,
  add column if not exists cancellation_policy text;

grant select (business_id_number, cancellation_policy) on public.businesses to anon;

commit;

-- Verify:
--   select column_name from information_schema.column_privileges
--    where table_schema='public' and table_name='businesses'
--      and grantee='anon' and column_name in ('business_id_number','cancellation_policy');
--   -> must return two rows
