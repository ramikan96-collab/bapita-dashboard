-- Demo lifecycle: give an outreach pitch site a clock.
-- Spec: agent-team/agents/bertan/docs/specs/2026-09-05-bertan-v1-design.md §6
-- Project: ixihybsstplqavbpbrlo (prod)
--
-- WHAT: one nullable timestamptz, plus a partial index for the daily sweep.
--
-- WHY ONE COLUMN AND NOT `is_demo`. The spec's locked decision #6 says demo rows are
-- "flagged is_demo". A boolean is not needed: `lead_source = 'outreach'` (added
-- 2026-08-31-lead-source.sql) already records that a row was created as a pitch site rather
-- than by a real signup, and adding is_demo would create a second marker that has to be kept
-- in sync with the first forever.
--
-- The thing that genuinely does not exist yet is the *lifecycle*: when does this row stop
-- being temporary. So that is what this column is, and it doubles as the flag:
--
--     demo_expires_at IS NOT NULL  ->  a demo on a clock, swept when it passes
--     demo_expires_at IS NULL      ->  not on a clock. Either never was a demo, or it was
--                                      converted to a real customer.
--
-- Converting a demo is therefore `set demo_expires_at = null`, which removes it from the
-- sweep exactly as the spec requires — and unlike clearing lead_source, it does not destroy
-- the provenance record of where that customer came from. That is the whole argument for
-- this shape over a boolean.
--
-- NO ANON GRANT, deliberately, for the same reason as lead_source. `anon` reads
-- public.businesses through a COLUMN-LEVEL allowlist (2026-07-08-custom-domain-grants.sql),
-- and this column is never named by src/app/[slug]/page.tsx or any other anon-key query — it
-- is read through the service-role client only. Granting it would publish which tenant pages
-- are sales demos. The 2026-08-22 lesson is "grant when the public select names it", not
-- "grant every column".
--
-- The index IS worth it here, unlike lead_source: the daily cron scans for expired rows every
-- night and the predicate is highly selective — a partial index on a nullable column costs
-- nothing on the ~99% of rows where the column is null.

alter table public.businesses add column if not exists demo_expires_at timestamptz;

create index if not exists businesses_demo_expires_at_idx
  on public.businesses (demo_expires_at)
  where demo_expires_at is not null;

comment on column public.businesses.demo_expires_at is
  'Demo lifecycle clock. NOT NULL = a sales demo that the daily cron deletes once it passes. NULL = not a demo, or a demo converted to a real customer. Set on creation by /api/outreach/site; cleared by hand on conversion. Never granted to anon.';

-- Verify the column exists and is nullable (one row, is_nullable = YES):
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_schema='public' and table_name='businesses' and column_name='demo_expires_at';
--
-- Verify anon CANNOT read it (must return ZERO rows). privilege_type='SELECT' matters:
-- anon holds default table-wide INSERT/UPDATE/REFERENCES that every new column inherits, so
-- omitting the predicate returns rows and looks like a failure when it is not.
--   select column_name from information_schema.column_privileges
--    where table_schema='public' and table_name='businesses'
--      and grantee='anon' and column_name='demo_expires_at'
--      and privilege_type='SELECT';
--
-- Verify the index landed:
--   select indexname, indexdef from pg_indexes
--    where tablename='businesses' and indexname='businesses_demo_expires_at_idx';
--
-- Verify a live tenant page still returns 200 after this runs. The column is not in the anon
-- select, so it should be unaffected — but that is the exact assumption that broke production
-- on 2026-08-22, so check it rather than reason about it.
--
-- Rollback (safe: nothing reads it until the sweep ships, and the sweep is dry-run by default):
--   drop index if exists businesses_demo_expires_at_idx;
--   alter table public.businesses drop column demo_expires_at;
