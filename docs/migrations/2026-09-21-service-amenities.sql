-- Migration: amenities on stay units
-- Project: ixihybsstplqavbpbrlo (prod)
--
-- A stay business reuses `services` as rentable units. `amenities` holds keys
-- from src/lib/amenities.ts (a closed vocabulary with EN + HE labels); unknown
-- keys are ignored at render time. Appointment businesses leave it empty.
--
-- Additive only. anon already reads `services` through a table-level grant
-- (has_table_privilege('anon','public.services','SELECT') = true), so the new
-- column needs no column grant — unlike `businesses`, see
-- 2026-08-22-stay-anon-column-grants.sql.

begin;

alter table public.services
  add column if not exists amenities text[] not null default '{}';

commit;

-- Verify:
--   select column_name, data_type, column_default from information_schema.columns
--    where table_schema='public' and table_name='services' and column_name='amenities';
--   -> one row, ARRAY, '{}'::text[]
