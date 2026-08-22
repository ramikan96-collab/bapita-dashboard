-- Migration: business_type + stay (short-term rental) bookings
-- Spec: docs/specs/2026-08-22-stay-business-type-design.md
-- Project: ixihybsstplqavbpbrlo (prod)
--
-- Additive. No data loss, no backfill of existing rows required.
--
-- Model decision: a "stay" business reuses the existing services table as its
-- unit inventory (a kasa = a service row, price = nightly rate) and the existing
-- bookings table as its reservations. bookings.appointment_date IS the check-in
-- date, so Google Calendar sync, confirmation emails, the clients table and every
-- dashboard query keep working untouched. check_out is purely additive:
--
--     check_out IS NULL      -> appointment  (today's behavior, unchanged)
--     check_out IS NOT NULL  -> stay
--
-- Sections:
--   1. businesses.business_type + gallery_groups
--   2. services stay fields (min_nights, max_guests)
--   3. bookings stay fields (check_out, guests) + sanity constraint
--   4. bookings_slot_unique -> partial (appointments only)   <-- REQUIRED, see note
--   5. seed: kasa-herzeliya becomes a stay business

begin;

-- 1. businesses -------------------------------------------------------------
alter table public.businesses
  add column if not exists business_type text not null default 'appointment';

alter table public.businesses
  drop constraint if exists businesses_business_type_check;
alter table public.businesses
  add constraint businesses_business_type_check
  check (business_type in ('appointment', 'stay'));

-- Per-unit photo grouping for the public gallery: { "<service_id>": ["url", ...] }.
-- A URL absent from every group stays in the shared gallery section.
alter table public.businesses
  add column if not exists gallery_groups jsonb;

-- 2. services (= units, in stay mode) ---------------------------------------
alter table public.services
  add column if not exists min_nights int not null default 1;
alter table public.services
  add column if not exists max_guests int;

alter table public.services
  drop constraint if exists services_min_nights_check;
alter table public.services
  add constraint services_min_nights_check check (min_nights >= 1 and min_nights <= 365);

-- 3. bookings ---------------------------------------------------------------
alter table public.bookings
  add column if not exists check_out date;
alter table public.bookings
  add column if not exists guests int;

-- A stay must end after it starts. NULL check_out (appointments) is unaffected.
alter table public.bookings
  drop constraint if exists bookings_check_out_after_check_in;
alter table public.bookings
  add constraint bookings_check_out_after_check_in
  check (check_out is null or check_out > appointment_date);

-- Range lookups: "which stays for this unit overlap [start, end)?"
create index if not exists bookings_stay_range_idx
  on public.bookings (business_id, service_id, appointment_date, check_out)
  where check_out is not null;

-- 4. bookings_slot_unique --> exempt stays, keep the status predicate ---------
--
-- CRITICAL, and verified against production before writing (2026-08-22) rather
-- than against CLAUDE.md, which was stale: the live index is
--
--   (business_id, appointment_date, appointment_time)
--   WHERE status = ANY (ARRAY['confirmed','pending'])
--
-- The status predicate matters — it is what stops a cancelled row from holding
-- its slot forever — so it is CARRIED OVER, not replaced. We only AND in the
-- stay exemption. Every stay checks in at the same default time (15:00), so
-- without `check_out IS NULL` three units booked for the same night would
-- collide and only the first would insert.
--
-- Stay overlap is a range test, not an equality test, and cannot be expressed
-- as a unique index. It is enforced in the API (src/lib/stay.ts).
drop index if exists public.bookings_slot_unique;
create unique index bookings_slot_unique
  on public.bookings (business_id, appointment_date, appointment_time)
  where check_out is null
    and status = any (array['confirmed'::text, 'pending'::text]);

-- 5. seed -------------------------------------------------------------------
update public.businesses
   set business_type = 'stay'
 where slug = 'kasa-herzeliya';

commit;

-- Verify (run separately after commit):
--   select slug, business_type from businesses where slug = 'kasa-herzeliya';
--   select indexdef from pg_indexes where indexname = 'bookings_slot_unique';
--     -> must end with: WHERE ((check_out IS NULL) AND (status = ANY (...)))
