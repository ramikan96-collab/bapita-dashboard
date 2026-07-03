-- 2026-07-03 staff scheduling: make staff a schedulable resource.
-- Adds the booking<->staff link, per-service staff eligibility, the public
-- "let customers choose their professional" flag, and staff color/active.
-- Safe to re-run (idempotent). Existing bookings keep staff_id = null (unassigned).

alter table public.bookings
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

alter table public.services
  add column if not exists staff_ids uuid[] not null default '{}';

alter table public.businesses
  add column if not exists allow_staff_choice boolean not null default false;

-- staff table already exists; ensure color/active columns + defaults for older rows.
alter table public.staff
  add column if not exists color text,
  add column if not exists active boolean not null default true;

create index if not exists idx_bookings_business_staff_date
  on public.bookings (business_id, staff_id, appointment_date);
