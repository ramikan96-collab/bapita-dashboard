-- Friday and Saturday night rate for stay units. Null means `price` every night,
-- so every existing unit keeps its current total. anon reads `services` through a
-- table-level grant, so no column grant is needed (unlike `businesses`).
alter table public.services
  add column if not exists weekend_price numeric;

comment on column public.services.weekend_price is
  'Stay units only: nightly rate for Friday and Saturday nights. Null = price every night.';
