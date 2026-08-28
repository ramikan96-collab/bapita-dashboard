-- Phase 5B: configurable CTA button label
-- Plan: docs/2026-08-28-phase-5-plan.md (repo root docs/, task 5B.1)
-- Project: ixihybsstplqavbpbrlo (prod)
--
-- WHAT: two nullable text columns holding the label of the primary call-to-action
-- button on a public tenant page, in English and Hebrew.
--
-- WHY: a business that sends bookings to an external system (external_booking_url
-- set) is not "booking" — it is enquiring, reserving, ordering, or messaging on
-- WhatsApp. The button copy has to follow. Both columns are nullable and both fall
-- back to the existing translation string, so a business that sets neither renders
-- exactly as it does today.
--
-- No cta_mode column: the mode is DERIVED from external_booking_url being set.
-- That is already the live rule on shimi-azut-hairstudio, which 5B generalises
-- into the three shared themes.

alter table public.businesses add column if not exists cta_label    text;
alter table public.businesses add column if not exists cta_label_he text;

-- MANDATORY, not optional. `anon` holds COLUMN-LEVEL selects on public.businesses
-- (69-column allowlist from 2026-07-08-custom-domain-grants.sql), and Postgres does
-- not extend a column-level grant to new columns. Without these two lines, the
-- moment src/app/[slug]/page.tsx selects cta_label the anon query fails and that
-- page turns any query error into notFound() — every public page 404s.
-- This is exactly the 2026-08-22 incident; see 2026-08-22-stay-anon-column-grants.sql.
--
-- Both values are public information: they are rendered as the button's visible text.
grant select (cta_label, cta_label_he) on public.businesses to anon;

-- Verify (must return both rows):
--   select column_name from information_schema.column_privileges
--    where table_schema='public' and table_name='businesses'
--      and grantee='anon' and privilege_type='SELECT'
--      and column_name in ('cta_label','cta_label_he');
--
-- Rollback (safe at any time — no data depends on these; dropping a column drops
-- its grant with it):
--   alter table public.businesses drop column cta_label, drop column cta_label_he;
