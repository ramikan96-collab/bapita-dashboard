-- First-party analytics for the public booking funnel (book.bapita.com).
-- Captures the visitor "staircase": page_view -> booking_started -> step_reached
-- -> booking_completed, plus no_slots (demand signal). Visitors are counted as
-- people via an anonymous browser-generated session_id (no PII, no cookies).
--
-- Writes come from /api/public/track (service-role, bypasses RLS). This migration
-- keeps RLS ON with an owner-scoped SELECT policy so the dashboard can read each
-- business's own rows directly; admin cross-tenant reads use the service client.

create table if not exists public.page_events (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null,
  slug         text,
  session_id   text not null,     -- anonymous, from browser localStorage (bp_sid)
  event        text not null,     -- 'page_view'|'booking_started'|'step_reached'|'no_slots'|'booking_completed'
  step         text,              -- 'service'|'staff'|'date'|'time'|'contact' (for step_reached)
  referrer     text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  source       text,              -- normalized first-touch: 'instagram'|'google'|'whatsapp'|'direct'|'other'
  device       text,              -- 'mobile'|'desktop'|'tablet'
  lang         text,
  meta         jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists page_events_biz_time  on public.page_events (business_id, created_at desc);
create index if not exists page_events_biz_event on public.page_events (business_id, event, created_at desc);
create index if not exists page_events_session   on public.page_events (session_id);

alter table public.page_events enable row level security;

-- Owners read only their own businesses' events (mirrors the owner_id scoping
-- used across the app). Inserts do NOT go through RLS — the ingest endpoint uses
-- the service-role client — so no anon INSERT policy is granted here.
drop policy if exists "page_events: owner reads own" on public.page_events;
create policy "page_events: owner reads own"
  on public.page_events
  for select
  to authenticated
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );
