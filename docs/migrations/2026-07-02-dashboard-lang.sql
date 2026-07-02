-- Dashboard UI language (per business/user). Run in Supabase SQL editor
-- (project ixihybsstplqavbpbrlo). Safe to re-run.
alter table businesses
  add column if not exists dashboard_lang text not null default 'en'
  check (dashboard_lang in ('en', 'he'));
