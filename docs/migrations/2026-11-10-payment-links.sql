-- Stay pay links (spec: docs/specs/2026-11-10-stay-pay-link.md)
--
-- ADDITIVE ONLY: one new table, no existing column, constraint or row is touched.
-- A host creates a private link for one booking with an agreed amount; the guest
-- opens /pay/l/<token> and pays on Green Invoice's hosted page.
--
-- All reads/writes from the app go through server routes using the service role.
-- Owners get SELECT on their own rows (dashboard drawer); admins full. No owner
-- INSERT/UPDATE policy: the create/cancel route does the ownership check itself.

create table if not exists public.payment_links (
  id           uuid primary key default gen_random_uuid(),
  token        text not null unique check (char_length(token) >= 40),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  amount       numeric(10,2) not null check (amount > 0 and amount <= 100000),
  lang         text not null default 'en' check (lang in ('en','he')),
  status       text not null default 'active' check (status in ('active','paid','cancelled')),
  expires_at   timestamptz not null,
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists payment_links_booking_idx on public.payment_links (booking_id);

-- At most one active link per booking.
create unique index if not exists payment_links_one_active
  on public.payment_links (booking_id) where status = 'active';

alter table public.payment_links enable row level security;

create policy "payment_links: owner select" on public.payment_links
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "payment_links: admin full" on public.payment_links
  for all to authenticated
  using (is_admin()) with check (is_admin());
