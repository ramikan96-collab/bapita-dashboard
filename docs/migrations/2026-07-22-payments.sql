-- Migration: Online deposits via Green Invoice (Morning) — Phase 0 schema
-- Spec: docs/specs/2026-07-22-online-payments-greeninvoice.md
-- Project: ixihybsstplqavbpbrlo (prod)
--
-- Additive + safe to run in one transaction. No data backfill required.
-- Deposit amounts are ALWAYS recomputed server-side; these columns are config only.
--
-- Sections:
--   1. transactions            (new) — one row per collected deposit
--   2. payment_credentials     (new) — per-tenant GI API id+secret, owner-only RLS
--   3. services deposit fields (alter)
--   4. businesses deposit defaults (alter)
--   5. bookings.payment_status enum widen (check constraint)
--   6. addons payments type (check constraint)
--   7. businesses cross-tenant read tightening (REVIEW before apply — see note)

begin;

-- 1. transactions -----------------------------------------------------------
create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  booking_id       uuid references public.bookings(id) on delete set null,
  amount           numeric not null check (amount >= 0),
  currency         text not null default 'ILS',
  provider         text not null default 'greeninvoice',
  provider_txn_id  text not null,          -- GI transaction/payment id
  invoice_url      text,                   -- GI-hosted legal invoice/receipt
  status           text not null default 'paid'
                     check (status in ('pending','paid','failed','refunded')),
  created_at       timestamptz not null default now(),
  -- idempotency: a webhook re-delivery for the same GI txn must not double-insert
  unique (provider, provider_txn_id)
);

create index if not exists transactions_business_id_idx on public.transactions(business_id);
create index if not exists transactions_booking_id_idx  on public.transactions(booking_id);

alter table public.transactions enable row level security;

-- Owner reads own business's transactions; admin full; writes are service-role only
-- (webhook uses service role, RLS-exempt) so no INSERT policy is granted to owners.
create policy "transactions: owner select" on public.transactions
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "transactions: admin full" on public.transactions
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- 2. payment_credentials ----------------------------------------------------
-- GI API id + secret, per tenant. Secret stored ENCRYPTED at rest (app-layer,
-- via PAYMENTS_ENC_KEY). NEVER placed on the businesses row (that row has an
-- open authenticated cross-tenant read — see section 7). Owner-only RLS; the
-- server reads via service role for token exchange.
create table if not exists public.payment_credentials (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null references public.businesses(id) on delete cascade,
  provider              text not null default 'greeninvoice',
  api_id                text not null,
  api_secret_encrypted  text not null,     -- app-layer encrypted; never plaintext
  connected_at          timestamptz not null default now(),
  unique (business_id, provider)
);

alter table public.payment_credentials enable row level security;

-- Owner may see WHETHER a row exists / api_id, but the secret column is read by
-- service role only. RLS is row-level; the app never selects api_secret_encrypted
-- to the client. Owner select scoped to own business.
create policy "payment_credentials: owner select" on public.payment_credentials
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "payment_credentials: admin full" on public.payment_credentials
  for all to authenticated
  using (is_admin()) with check (is_admin());
-- No owner INSERT/UPDATE policy: connect flow writes via service role after the
-- token-exchange test call succeeds, keeping the secret off the client entirely.

-- 3. services deposit fields ------------------------------------------------
alter table public.services
  add column if not exists deposit_required boolean not null default false,
  add column if not exists deposit_type     text
    check (deposit_type in ('percent','fixed')),
  add column if not exists deposit_value    numeric
    check (deposit_value is null or deposit_value >= 0);

-- 4. businesses deposit defaults --------------------------------------------
alter table public.businesses
  add column if not exists deposit_enabled       boolean not null default false,
  add column if not exists deposit_default_type  text
    check (deposit_default_type in ('percent','fixed')),
  add column if not exists deposit_default_value numeric
    check (deposit_default_value is null or deposit_default_value >= 0);

-- 5. bookings.payment_status widen ------------------------------------------
-- Existing check: none|cash|transfer|stripe. Add pending_payment|deposit_paid|expired.
-- Keep stripe for back-compat (unused going forward). Booking.status is untouched:
-- a deposit-pending booking stays status='pending' with payment_status='pending_payment'.
alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check
  check (payment_status in (
    'none','cash','transfer','stripe',
    'pending_payment','deposit_paid','expired'
  ));

-- 6. addons payments type ---------------------------------------------------
-- Existing check: whatsapp|stripe|google_business. Add payments (the on/off switch
-- the Financials page will read instead of the stripe stub).
alter table public.addons drop constraint if exists addons_addon_type_check;
alter table public.addons add constraint addons_addon_type_check
  check (addon_type in ('whatsapp','stripe','google_business','payments'));

-- one addon row per (business, type) so the connect flow can upsert idempotently
alter table public.addons drop constraint if exists addons_business_id_addon_type_key;
alter table public.addons add constraint addons_business_id_addon_type_key
  unique (business_id, addon_type);

commit;

-- 7. Cross-tenant read tightening on businesses -----------------------------
-- REVIEW BEFORE APPLYING. Pre-existing finding (audit 2026-07-04, note @L133):
-- policy "businesses: public read by slug" USING(true) applies to {anon,authenticated}.
-- anon is already column-restricted (safe cols only). authenticated has table-wide
-- column grants, so any logged-in owner can read another tenant's billing/contact
-- columns. Fix = drop authenticated from the public-read policy; authenticated still
-- reads its OWN business via "businesses: owner select" and admin via is_admin().
--
-- RISK: only correct if NO authenticated-client path reads another business's public
-- data (SSR public pages use the anon key — verify [slug]/page.tsx before apply).
-- Left OUTSIDE the transaction above so it is a deliberate, separately-reviewed step.
--
-- drop policy "businesses: public read by slug" on public.businesses;
-- create policy "businesses: public read by slug" on public.businesses
--   for select to anon using (true);
