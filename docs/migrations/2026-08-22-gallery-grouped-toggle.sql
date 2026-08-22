-- Migration: gallery_grouped display toggle
-- Follows: 2026-08-22-stay-business-type.sql
-- Project: ixihybsstplqavbpbrlo (prod)
--
-- Lets a business choose how the public gallery SECTION renders:
--   true  -> one block per unit, unit name as heading (stay businesses)
--   false -> a single flat grid of every photo (today's behaviour)
--
-- Unit CARDS are unaffected either way; they always use their own cover photo.
--
-- Safe for appointment businesses: with no gallery_groups, the grouped renderer
-- has nothing to group and falls through to the flat grid, so the default of
-- true changes nothing for them.

begin;

alter table public.businesses
  add column if not exists gallery_grouped boolean not null default true;

-- REQUIRED. `anon` reads businesses through a column-level grant allowlist, not
-- a table grant, so a new column is invisible to it until granted — and
-- src/app/[slug]/page.tsx turns a failed anon query into notFound(), i.e. a 404
-- on every public tenant page. This is exactly what took the site down on
-- 2026-08-22; see docs/migrations/2026-08-22-stay-anon-column-grants.sql.
grant select (gallery_grouped) on public.businesses to anon;

commit;

-- Verify:
--   select column_name from information_schema.column_privileges
--    where table_schema='public' and table_name='businesses'
--      and grantee='anon' and column_name='gallery_grouped';
--   -> must return one row
